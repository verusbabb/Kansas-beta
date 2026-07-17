/**
 * Woogle eval runner.
 *
 * Boots a headless Nest application context, calls AskService.ask() for each
 * case in the dataset, scores the result against the (optional) expectations,
 * and prints a per-case report plus tuning aggregates (latency, steps, tool
 * usage, fallback rate).
 *
 * Usage:
 *   npm run woogle:eval                 # structural checks only
 *   npm run woogle:eval -- --judge      # also LLM-grade answer quality (needs GEMINI_API_KEY)
 *   npm run woogle:eval -- --ci         # exit non-zero if any case fails
 *   npm run woogle:eval -- --filter exec   # only cases whose id/question matches
 *   npm run woogle:eval -- --json       # machine-readable JSON output
 */
import { resolve } from 'path'
import { config as dotenvConfig } from 'dotenv'
import { NestFactory } from '@nestjs/core'
import { Sequelize } from 'sequelize-typescript'
import { GoogleGenAI } from '@google/genai'
import { AppModule } from '../../app.module'
import { AskService } from '../ask.service'
import type { AskResponseDto } from '../dto/ask-response.dto'
import { WOOGLE_EVAL_CASES, EvalCase, EvalExpectation } from './woogle-eval-dataset'

// --- tiny ANSI helpers (no extra deps) -------------------------------------
const c = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
}

interface CliOptions {
  ci: boolean
  judge: boolean
  json: boolean
  filter: string | null
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = { ci: false, judge: false, json: false, filter: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--ci') opts.ci = true
    else if (a === '--judge') opts.judge = true
    else if (a === '--json') opts.json = true
    else if (a === '--filter') opts.filter = argv[++i] ?? null
  }
  return opts
}

interface JudgeResult {
  pass: boolean
  reason: string
}

interface CaseResult {
  id: string
  question: string
  isAdmin: boolean
  ok: boolean
  failures: string[]
  engine: string
  toolsUsed: string[]
  steps: number
  latencyMs: number
  fallbackReason: string | null
  resultCount: number
  answerPreview: string
  judge?: JudgeResult
  error?: string
}

/** Build a single lowercase haystack from everything textual in the response. */
function buildHaystack(res: AskResponseDto): string {
  const parts: string[] = []
  if (res.interpretation) parts.push(res.interpretation)
  if (res.answer) parts.push(res.answer)
  for (const r of res.results ?? []) parts.push(`${r.firstName} ${r.lastName}`)
  for (const s of res.sources ?? []) if (s.title) parts.push(s.title)
  return parts.join(' \n ').toLowerCase()
}

/** Score structural + content expectations (everything except the LLM judge). */
function scoreStructural(exp: EvalExpectation, res: AskResponseDto): string[] {
  const failures: string[] = []
  const tools = res.trace?.toolsUsed ?? []
  const haystack = buildHaystack(res)

  if (exp.engine && res.trace?.engine !== exp.engine) {
    failures.push(`engine: expected "${exp.engine}", got "${res.trace?.engine}"`)
  }
  if (exp.toolsUsedAny?.length && !exp.toolsUsedAny.some((t) => tools.includes(t))) {
    failures.push(
      `toolsUsedAny: expected one of [${exp.toolsUsedAny.join(', ')}], got [${tools.join(', ')}]`,
    )
  }
  if (exp.toolsUsedAll?.length) {
    const missing = exp.toolsUsedAll.filter((t) => !tools.includes(t))
    if (missing.length) failures.push(`toolsUsedAll: missing [${missing.join(', ')}]`)
  }
  if (exp.toolsNotUsed?.length) {
    const present = exp.toolsNotUsed.filter((t) => tools.includes(t))
    if (present.length) failures.push(`toolsNotUsed: unexpectedly used [${present.join(', ')}]`)
  }
  if (exp.mustInclude?.length) {
    const missing = exp.mustInclude.filter((s) => !haystack.includes(s.toLowerCase()))
    if (missing.length) failures.push(`mustInclude: missing [${missing.join(', ')}]`)
  }
  if (exp.mustNotInclude?.length) {
    const present = exp.mustNotInclude.filter((s) => haystack.includes(s.toLowerCase()))
    if (present.length) failures.push(`mustNotInclude: present [${present.join(', ')}]`)
  }
  if (exp.minResults != null && (res.results?.length ?? 0) < exp.minResults) {
    failures.push(`minResults: expected >= ${exp.minResults}, got ${res.results?.length ?? 0}`)
  }
  if (exp.maxSteps != null && (res.trace?.steps ?? 0) > exp.maxSteps) {
    failures.push(`maxSteps: expected <= ${exp.maxSteps}, got ${res.trace?.steps}`)
  }
  return failures
}

/** Optional LLM judge for answer quality against a natural-language rubric. */
async function judgeAnswer(
  genAI: GoogleGenAI,
  question: string,
  res: AskResponseDto,
  rubric: string,
): Promise<JudgeResult> {
  const answer = res.answer || res.interpretation || '(no answer text; member cards only)'
  const prompt = `You are grading an AI assistant's answer for a fraternity chapter website.

Question: ${question}

Assistant answer: ${answer}

Pass criteria: ${rubric}

Reply with ONLY a JSON object: {"pass": true|false, "reason": "<one sentence>"}.`
  try {
    const out = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json', temperature: 0 },
    })
    const parsed = JSON.parse(out.text ?? '{}') as Partial<JudgeResult>
    return { pass: !!parsed.pass, reason: parsed.reason ?? 'no reason' }
  } catch (err: any) {
    return { pass: false, reason: `judge error: ${err?.message ?? 'unknown'}` }
  }
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[Math.max(0, idx)]
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))

  // Match main.ts: load backend/.env before anything reads process.env.
  dotenvConfig({ path: resolve(__dirname, '../../../.env') })

  const cases = WOOGLE_EVAL_CASES.filter((tc) => {
    if (!opts.filter) return true
    const f = opts.filter.toLowerCase()
    return tc.id.toLowerCase().includes(f) || tc.question.toLowerCase().includes(f)
  })

  if (!cases.length) {
    console.error(c.red(`No eval cases match filter "${opts.filter}".`))
    process.exit(2)
  }

  let judge: GoogleGenAI | null = null
  if (opts.judge) {
    const key = process.env.GEMINI_API_KEY
    if (!key) {
      console.error(c.red('--judge requires GEMINI_API_KEY in the environment.'))
      process.exit(2)
    }
    judge = new GoogleGenAI({ apiKey: key })
  }

  console.error(c.gray('Booting application context...'))
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false })

  // Silence Sequelize's per-query SQL logging so the eval report is readable.
  try {
    const sequelize = app.get(Sequelize, { strict: false })
    if (sequelize) (sequelize.options as { logging: unknown }).logging = false
  } catch {
    /* no-op: if the instance can't be resolved, leave logging as-is */
  }

  const askService = app.get(AskService)

  const results: CaseResult[] = []

  for (const tc of cases as EvalCase[]) {
    const isAdmin = !!tc.isAdmin
    const canSeeRush = !!tc.canSeeRush || isAdmin
    const started = Date.now()
    try {
      const res = await askService.ask({ query: tc.question }, { isAdmin, canSeeRush })
      const failures = scoreStructural(tc.expect, res)

      let judgeResult: JudgeResult | undefined
      if (judge && tc.expect.rubric) {
        judgeResult = await judgeAnswer(judge, tc.question, res, tc.expect.rubric)
        if (!judgeResult.pass) failures.push(`judge: ${judgeResult.reason}`)
      }

      results.push({
        id: tc.id,
        question: tc.question,
        isAdmin,
        ok: failures.length === 0,
        failures,
        engine: res.trace?.engine ?? 'unknown',
        toolsUsed: res.trace?.toolsUsed ?? [],
        steps: res.trace?.steps ?? 0,
        latencyMs: res.trace?.latencyMs ?? Date.now() - started,
        fallbackReason: res.trace?.fallbackReason ?? null,
        resultCount: res.results?.length ?? 0,
        answerPreview: (res.answer || res.interpretation || '').slice(0, 160),
        judge: judgeResult,
      })
    } catch (err: any) {
      results.push({
        id: tc.id,
        question: tc.question,
        isAdmin,
        ok: false,
        failures: [`threw: ${err?.message ?? 'unknown error'}`],
        engine: 'error',
        toolsUsed: [],
        steps: 0,
        latencyMs: Date.now() - started,
        fallbackReason: null,
        resultCount: 0,
        answerPreview: '',
        error: err?.message ?? 'unknown error',
      })
    }
  }

  await app.close()

  // --- Output ---------------------------------------------------------------
  if (opts.json) {
    console.log(JSON.stringify(results, null, 2))
  } else {
    console.log('')
    console.log(c.bold('Woogle eval results'))
    console.log(c.gray('─'.repeat(72)))
    for (const r of results) {
      const status = r.ok ? c.green('PASS') : c.red('FAIL')
      const admin = r.isAdmin ? c.cyan(' [admin]') : ''
      console.log(`${status} ${c.bold(r.id)}${admin}  ${c.gray(`${r.latencyMs}ms`)}`)
      console.log(`     ${c.gray('Q:')} ${r.question}`)
      console.log(
        `     ${c.gray('engine:')} ${r.engine}  ${c.gray('steps:')} ${r.steps}  ` +
          `${c.gray('tools:')} [${r.toolsUsed.join(', ')}]  ${c.gray('results:')} ${r.resultCount}`,
      )
      if (r.fallbackReason) console.log(`     ${c.yellow('fallback:')} ${r.fallbackReason}`)
      if (r.answerPreview) console.log(`     ${c.gray('answer:')} ${r.answerPreview}`)
      if (r.judge) {
        const j = r.judge.pass ? c.green('judge:pass') : c.red('judge:fail')
        console.log(`     ${j} ${c.gray(r.judge.reason)}`)
      }
      for (const f of r.failures) console.log(`     ${c.red('✗')} ${f}`)
      console.log('')
    }

    // --- Aggregates ---------------------------------------------------------
    const passed = results.filter((r) => r.ok).length
    const latencies = results.map((r) => r.latencyMs)
    const avgLatency = latencies.length
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0
    const avgSteps = results.length
      ? (results.reduce((a, b) => a + b.steps, 0) / results.length).toFixed(1)
      : '0'
    const fallbacks = results.filter((r) => r.engine === 'fallback').length
    const errors = results.filter((r) => r.engine === 'error').length

    const toolHistogram = new Map<string, number>()
    for (const r of results) {
      for (const t of r.toolsUsed) toolHistogram.set(t, (toolHistogram.get(t) ?? 0) + 1)
    }
    const toolSummary = [...toolHistogram.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([t, n]) => `${t}×${n}`)
      .join(', ')

    console.log(c.bold('Summary'))
    console.log(c.gray('─'.repeat(72)))
    const passLabel = `${passed}/${results.length}`
    console.log(
      `  ${c.gray('pass rate:')}   ${passed === results.length ? c.green(passLabel) : c.yellow(passLabel)}`,
    )
    console.log(
      `  ${c.gray('latency:')}     avg ${avgLatency}ms · p95 ${percentile(latencies, 95)}ms`,
    )
    console.log(`  ${c.gray('avg steps:')}   ${avgSteps}`)
    console.log(
      `  ${c.gray('fallbacks:')}   ${fallbacks}${errors ? c.red(`  errors: ${errors}`) : ''}`,
    )
    console.log(`  ${c.gray('tool usage:')}  ${toolSummary || '(none)'}`)
    console.log('')
  }

  const anyFailed = results.some((r) => !r.ok)
  if (opts.ci && anyFailed) process.exit(1)
  process.exit(0)
}

main().catch((err) => {
  console.error(c.red('Eval runner crashed:'), err)
  process.exit(1)
})
