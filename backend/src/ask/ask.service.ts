import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { Op } from 'sequelize'
import { PinoLogger } from 'nestjs-pino'
import { GoogleGenAI, Type } from '@google/genai'
import type { Content, FunctionDeclaration, Part } from '@google/genai'
import { Person } from '../database/entities/person.entity'
import { ExecAssignment } from '../database/entities/exec-assignment.entity'
import { ExecTerm } from '../database/entities/exec-term.entity'
import { ExecPosition } from '../database/entities/exec-position.entity'
import { PersonRelationship } from '../database/entities/person-relationship.entity'
import { Newsletter } from '../database/entities/newsletter.entity'
import { EnrichmentService } from './enrichment/enrichment.service'
import { WoogleSqlService, SqlValidationError } from './woogle-sql.service'
import type { SqlTier } from './woogle-sql.service'
import { viewerCounterpartRoleLabel } from '../person-relationships/relationship-connection-display'
import { RetrievalService } from '../knowledge/retrieval.service'
import type { AskQueryDto } from './dto/ask-query.dto'
import type {
  AskResponseDto,
  AgentTraceDto,
  AlumniResultDto,
  EnrichRequestDto,
  EnrichResponseDto,
  PersonEnrichResultDto,
  OfficeHistoryItemDto,
  RelationshipItemDto,
  NewsletterSourceDto,
} from './dto/ask-response.dto'

interface ParsedFilters {
  cityFilter: string | null
  /** For metro areas: list of city/suburb substrings to OR together (e.g. KC metro). */
  cityFilters: string[] | null
  stateFilter: string | null
  pledgeClassYearMin: number | null
  pledgeClassYearMax: number | null
  nameFragment: string | null
  needsProfessionalData: boolean
  professionalCriteria: string | null
  interpretation: string
  /**
   * 'member_directory' — flat people search (name/city/state/year)
   * 'site_content'     — RAG only
   * 'mixed'            — RAG + people search
   * 'exec_lookup'      — exec officer history (joins exec_assignments → terms → positions)
   * 'parent_lookup'    — parents of members (traverses person_relationships)
   * 'legacy_lookup'    — members who have at least one member↔member relationship
   */
  queryType:
    | 'member_directory'
    | 'site_content'
    | 'mixed'
    | 'exec_lookup'
    | 'parent_lookup'
    | 'legacy_lookup'
  /** exec_lookup: position title to search (e.g. "president", "treasurer") */
  execPosition: string | null
  /** exec_lookup: only return officers from the current active term */
  execIsCurrent: boolean
  /** exec_lookup: specific exec term year to filter on */
  execYear: number | null
}

interface FullProfileCandidate {
  id: string
  firstName: string
  lastName: string
  city: string | null
  state: string | null
  pledgeClassYear: number | null
  linkedinProfileUrl: string | null
  email: string | null
  employer: string | null
  jobTitle: string | null
  profileHeadshotFilePath: string | null
  shareAddress: boolean
  shareEmail: boolean
  shareLinkedIn: boolean
  officeHistory: OfficeHistoryItemDto[]
  relationships: RelationshipItemDto[]
}

const QUERY_LIMIT = 100

/**
 * Maximum agent reasoning steps (tool round-trips) before we force a final
 * answer. Set comfortably above the real reasoning depth of our question types
 * (median 1-2, p95 ~3) so it acts as a safety ceiling, not an accuracy knob.
 */
const MAX_AGENT_STEPS = 5

/** Cap rows returned to the model per tool call to keep token usage bounded. */
const TOOL_RESULT_CAP = 60

/** Per-call viewer context (role gates verbose diagnostics and SQL views). */
export interface AskContext {
  isAdmin: boolean
  /** Viewer may query rush-CRM data (rush chairs and admins). */
  canSeeRush?: boolean
}

const AGENT_MODEL = 'gemini-2.5-flash'

/** Coerce an LLM-supplied tool arg to a trimmed non-empty string, or null. */
function asString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

/** Coerce an LLM-supplied tool arg to an integer, or null. */
function asInt(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? Math.trunc(n) : null
}

/** Coerce an LLM-supplied tool arg to a non-empty string array, or null. */
function asStringArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null
  const arr = v
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map((x) => x.trim())
  return arr.length ? arr : null
}

@Injectable()
export class AskService {
  private genAI: GoogleGenAI | null = null

  constructor(
    @InjectModel(Person)
    private readonly personModel: typeof Person,
    @InjectModel(ExecAssignment)
    private readonly execAssignmentModel: typeof ExecAssignment,
    @InjectModel(ExecTerm)
    private readonly execTermModel: typeof ExecTerm,
    @InjectModel(PersonRelationship)
    private readonly relationshipModel: typeof PersonRelationship,
    @InjectModel(Newsletter)
    private readonly newsletterModel: typeof Newsletter,
    private readonly enrichmentService: EnrichmentService,
    private readonly retrievalService: RetrievalService,
    private readonly woogleSqlService: WoogleSqlService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AskService.name)
    const apiKey = process.env.GEMINI_API_KEY
    if (apiKey) {
      this.genAI = new GoogleGenAI({ apiKey })
    }
  }

  /**
   * Entry point. Runs the function-calling agent and, if it fails, transparently
   * falls back to the legacy intent router. The returned `trace` reports which
   * engine answered so we can monitor fallback rate.
   */
  async ask(
    dto: AskQueryDto,
    ctx: AskContext = { isAdmin: false, canSeeRush: false },
  ): Promise<AskResponseDto> {
    if (!this.genAI) {
      throw new ServiceUnavailableException('AI service is not configured (missing GEMINI_API_KEY)')
    }

    const startedAt = Date.now()
    try {
      const { response, steps, toolsUsed, sqlQueries } = await this.runAgent(dto.query, ctx)
      const latencyMs = Date.now() - startedAt
      this.logger.info('Ask answered by agent', {
        query: dto.query.slice(0, 120),
        steps,
        toolsUsed,
        sqlCount: sqlQueries.length,
        latencyMs,
        results: response.results.length,
        isAdmin: ctx.isAdmin,
      })
      const trace: AgentTraceDto = {
        engine: 'agent',
        steps,
        toolsUsed,
        latencyMs,
        fallbackReason: null,
        // Generated SQL is only ever returned to admins.
        sql: ctx.isAdmin ? sqlQueries : null,
      }
      return { ...response, trace }
    } catch (err: any) {
      const reason = err?.message ?? 'unknown error'
      this.logger.warn('Agent failed — falling back to legacy router', {
        query: dto.query.slice(0, 120),
        reason,
      })
      const response = await this.askLegacy(dto)
      const trace: AgentTraceDto = {
        engine: 'fallback',
        steps: 0,
        toolsUsed: [],
        latencyMs: Date.now() - startedAt,
        fallbackReason: reason,
        sql: null,
      }
      return { ...response, trace }
    }
  }

  /**
   * Legacy intent-router path. Retained as an automatic fallback when the agent
   * throws, and useful for A/B comparison. Mirrors the pre-agent behavior.
   */
  private async askLegacy(dto: AskQueryDto): Promise<Omit<AskResponseDto, 'trace'>> {
    if (!this.genAI) {
      throw new ServiceUnavailableException('AI service is not configured (missing GEMINI_API_KEY)')
    }

    const filters = await this.parseQuery(dto.query)
    this.logger.info('Ask query parsed', { filters })

    // Pure site-content query: RAG path only
    if (filters.queryType === 'site_content') {
      const { answer, sources } = await this.generateRagAnswer(dto.query)
      return {
        interpretation: filters.interpretation,
        queryType: 'site_content',
        answer,
        sources,
        results: [],
        totalDbMatches: 0,
      }
    }

    // For mixed queries, run the RAG answer in parallel with the DB query
    const ragAnswerPromise =
      filters.queryType === 'mixed' ? this.generateRagAnswer(dto.query) : Promise.resolve(null)

    // Route to the appropriate DB query based on intent
    let dbResults: Person[]
    if (filters.queryType === 'exec_lookup') {
      dbResults = await this.queryExecTeam(filters)
    } else if (filters.queryType === 'parent_lookup') {
      dbResults = await this.queryParents(filters)
    } else if (filters.queryType === 'legacy_lookup') {
      dbResults = await this.queryLegacyMembers()
    } else {
      dbResults = await this.queryPeople(filters, QUERY_LIMIT)
    }
    const totalDbMatches = dbResults.length

    if (totalDbMatches === 0) {
      const earlyRag = await ragAnswerPromise
      return {
        interpretation: filters.interpretation,
        queryType: filters.queryType,
        answer: earlyRag?.answer ?? null,
        sources: earlyRag?.sources ?? [],
        results: [],
        totalDbMatches: 0,
      }
    }

    // Fetch full profile data (exec history + relationships) in parallel
    const personIds = dbResults.map((p) => p.id)
    const [assignments, relationships] = await Promise.all([
      this.loadExecAssignments(personIds),
      this.loadRelationships(personIds),
    ])

    // Build lookup maps keyed by personId
    const assignmentsByPersonId = new Map<string, OfficeHistoryItemDto[]>()
    for (const a of assignments) {
      const list = assignmentsByPersonId.get(a.personId!) ?? []
      list.push({
        position: a.execPosition?.displayName ?? 'Unknown',
        season: a.execTerm?.season ?? 'fall',
        year: a.execTerm?.year ?? 0,
        isCurrent: a.execTerm?.isCurrent ?? false,
      })
      assignmentsByPersonId.set(a.personId!, list)
    }

    const relationshipsByPersonId = new Map<string, RelationshipItemDto[]>()
    for (const r of relationships) {
      // Add to the "from" person
      if (r.fromPersonId && personIds.includes(r.fromPersonId)) {
        const list = relationshipsByPersonId.get(r.fromPersonId) ?? []
        const related = r.toPerson
        if (related) {
          list.push({
            relatedPersonId: related.id,
            relatedPersonName: `${related.firstName} ${related.lastName}`,
            relatedPersonPledgeYear: related.pledgeClassYear ?? null,
            relationshipType: r.relationshipType ?? null,
            direction: 'from',
          })
        }
        relationshipsByPersonId.set(r.fromPersonId, list)
      }
      // Add to the "to" person
      if (r.toPersonId && personIds.includes(r.toPersonId)) {
        const list = relationshipsByPersonId.get(r.toPersonId) ?? []
        const related = r.fromPerson
        if (related) {
          list.push({
            relatedPersonId: related.id,
            relatedPersonName: `${related.firstName} ${related.lastName}`,
            relatedPersonPledgeYear: related.pledgeClassYear ?? null,
            relationshipType: r.relationshipType ?? null,
            direction: 'to',
          })
        }
        relationshipsByPersonId.set(r.toPersonId, list)
      }
    }

    const candidates: FullProfileCandidate[] = dbResults.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      city: p.shareAddressWithLoggedInMembers ? (p.city ?? null) : null,
      state: p.shareAddressWithLoggedInMembers ? (p.state ?? null) : null,
      pledgeClassYear: p.pledgeClassYear ?? null,
      linkedinProfileUrl: p.shareLinkedInWithLoggedInMembers
        ? (p.linkedinProfileUrl ?? null)
        : null,
      email: p.shareEmailWithLoggedInMembers ? (p.personalEmail ?? null) : null,
      employer: p.shareEmployerWithLoggedInMembers ? (p.employer ?? null) : null,
      jobTitle: p.shareEmployerWithLoggedInMembers ? (p.jobTitle ?? null) : null,
      profileHeadshotFilePath: p.profileHeadshotFilePath ?? null,
      shareAddress: p.shareAddressWithLoggedInMembers,
      shareEmail: p.shareEmailWithLoggedInMembers,
      shareLinkedIn: p.shareLinkedInWithLoggedInMembers,
      officeHistory: assignmentsByPersonId.get(p.id) ?? [],
      relationships: relationshipsByPersonId.get(p.id) ?? [],
    }))

    const ragResult = await ragAnswerPromise

    return {
      interpretation: filters.interpretation,
      queryType: filters.queryType,
      answer: ragResult?.answer ?? null,
      sources: ragResult?.sources ?? [],
      results: candidates.map((c): AlumniResultDto => this.candidateToDto(c)),
      totalDbMatches,
    }
  }

  // ---------------------------------------------------------------------------
  // Agent (function-calling) path
  // ---------------------------------------------------------------------------

  /** Tool schema exposed to the model. Each maps to a private handler. */
  private agentToolDeclarations(): FunctionDeclaration[] {
    return [
      {
        name: 'search_members',
        description:
          'Search the chapter member directory by name, city/metro, US state, and/or pledge class year range. Use to find alumni/members. Returns matching members.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            nameFragment: { type: Type.STRING, description: 'Full or partial member name.' },
            cityFilters: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                'Lowercase city/suburb substrings to OR together (use several for a metro area, e.g. ["kansas city","overland park","leawood"]).',
            },
            stateFilter: {
              type: Type.STRING,
              description: 'Two-letter uppercase US state code, e.g. "KS".',
            },
            pledgeClassYearMin: {
              type: Type.INTEGER,
              description:
                'Minimum pledge class year (inclusive). For one exact class, set min and max to the same year.',
            },
            pledgeClassYearMax: {
              type: Type.INTEGER,
              description: 'Maximum pledge class year (inclusive).',
            },
          },
        },
      },
      {
        name: 'get_exec_history',
        description:
          'Look up chapter executive officers (president, VP, treasurer, secretary, IFC, etc.) by position, term year, and/or current status. Use for any question about who held or holds an office. This tool is AUTHORITATIVE: if it returns count 0 or a "note" saying an office is vacant, accept that answer — do NOT retry the same question with run_sql or repeated calls.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            position: {
              type: Type.STRING,
              description:
                'Lowercase position title, e.g. "president", "treasurer". Omit to get the whole exec team.',
            },
            year: { type: Type.INTEGER, description: 'Specific exec term year, e.g. 2019.' },
            isCurrent: {
              type: Type.BOOLEAN,
              description: 'True to restrict to the current active term only.',
            },
          },
        },
      },
      {
        name: 'find_relatives',
        description:
          'Find family connections among members. mode="parents" returns parents of members (optionally filtered to a member name or pledge class). mode="legacy" returns members who have a family link to another member.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            mode: {
              type: Type.STRING,
              enum: ['parents', 'legacy'],
              description: 'Which relationship lookup to run.',
            },
            nameFragment: {
              type: Type.STRING,
              description: 'For mode="parents": the member whose parents to find.',
            },
            pledgeClassYearMin: {
              type: Type.INTEGER,
              description:
                'For mode="parents": restrict to members of this class (set min and max equal for one class).',
            },
            pledgeClassYearMax: { type: Type.INTEGER },
          },
          required: ['mode'],
        },
      },
      {
        name: 'find_relationships',
        description:
          'Given ONE person\'s name, list their family connections with each counterpart\'s role relative to them (e.g. Son, Parent, Brother, Grandparent). Use for kinship questions like "who are X\'s sons/children/parents/brothers" and for "X\'s legacy connections". Each connection includes counterpartIsMember and isLegacy (true when BOTH people are chapter members) — use isLegacy to answer legacy-connection questions. Works even when the named person is a parent who is NOT a chapter member.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            personName: {
              type: Type.STRING,
              description: 'The person whose relatives to find, e.g. "James Brown".',
            },
          },
          required: ['personName'],
        },
      },
      {
        name: 'search_knowledge',
        description:
          'Semantic search over indexed site content: newsletters, chapter events, rush info, chapter history, house mom, exec rosters, and chapter facts. Use for narrative/content questions (summaries, "what happened", history). Call multiple times with focused sub-queries for broad questions.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING, description: 'A focused natural-language search phrase.' },
          },
          required: ['query'],
        },
      },
      {
        name: 'run_sql',
        description:
          'Run ONE read-only PostgreSQL SELECT over the woogle_* views for counts, aggregations, grouping, averages, or filters the other tools cannot express (e.g. "how many members per state", "which pledge class is largest", "average members per decade"). CTEs are allowed. It is strictly read-only. Prefer search_members when the user wants a browsable list of member cards rather than an aggregate.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            sql: {
              type: Type.STRING,
              description:
                'A single SELECT (or WITH ... SELECT) statement referencing only the provided woogle_* views.',
            },
          },
          required: ['sql'],
        },
      },
    ]
  }

  private agentSystemInstruction(tier: SqlTier, includeRush = false): string {
    const schema = this.woogleSqlService.schemaForTier(tier, includeRush)
    const rushGuidance = includeRush
      ? `- You have access to the rush recruitment pipeline via woogle_rush_prospects and woogle_rush_activities (this viewer is a rush chair or admin). Use run_sql for rush-candidate questions — e.g. "rush candidates we haven't responded to yet" → SELECT first_name, last_name, email, pipeline_stage FROM woogle_rush_prospects WHERE needs_response = true ORDER BY created_at. Rush prospects are NOT members and do NOT render as profile cards, so list them in your answer text.`
      : `- You do NOT have access to rush recruitment / prospect (rush candidate) data — it is restricted to rush chairs and admins. If asked about rush candidates/prospects/applicants, say plainly that this information isn't available to you. Do NOT speculate about how or where it is managed, and do NOT invent an explanation.`
    const adminGuidance =
      tier === 'admin'
        ? `- As an admin you can also query operational data via run_sql: woogle_email_campaigns / woogle_email_recipients (delivery and open tracking — e.g. open rates), woogle_person_enrichment (cached professional data), and woogle_guest_list. These are admin-only; list their results in your answer text (they are not members and do not render as cards).`
        : ''
    return `You are Woogle, the AI assistant for the Alpha Nu Chapter of Beta Theta Pi at the University of Kansas (brand: Kansas Beta / kansasbeta.org).

You answer members' questions by calling tools, then writing a concise, friendly, conversational answer.

Tools:
- search_members: find alumni/members by name, city/metro, state, or pledge class year.
- get_exec_history: find chapter officers (president, treasurer, etc.) by position, year, or current status. For "current president/treasurer/etc." call it ONCE with the position and isCurrent=true. It is authoritative — if it returns no officer (count 0 or a vacancy note), report the office as vacant; do NOT fall back to run_sql or call it again.
- find_relatives: list ALL parents of members (mode="parents", optionally filtered to a member name/class) or ALL legacy members (mode="legacy"). Use for broad rosters, NOT for one person's relatives.
- find_relationships: given ONE person's name, list that person's relatives with each counterpart's role (Son, Parent, Brother, etc.) plus counterpartIsMember and isLegacy flags. Use for "who are X's sons/children/parents/brothers" and "X's legacy connections" (filter connections where isLegacy is true). Works even if X is a non-member parent.
- search_knowledge: semantic search over newsletters, events, rush info, chapter history, house mom, and chapter facts. Call it multiple times with focused sub-queries for broad questions.
- run_sql: read-only PostgreSQL for counts/aggregations/grouping or filters the other tools can't express. Query ONLY these views (the list below is everything you may reference — anything not listed is off-limits and will be rejected):
${schema}

Guidelines:
- Choose the most specific tool(s). For metro areas, pass several city/suburb substrings to search_members via cityFilters.
- Use run_sql for "how many", "average", "most/least", "per state/year/decade", and similar analytics. Write a single SELECT (CTEs allowed); it is read-only. Members are rows where is_member = true.
- Prefer search_members (not run_sql) when the user wants a browsable list of members — those render as profile cards.
- You may request multiple tool calls at once when their results are independent.
- Member results are shown to the user as separate profile cards, so do NOT list every member in prose — give a brief summary (counts, notable highlights) instead.
- Base answers ONLY on tool results. If the tools return nothing relevant, say so plainly. Never invent members, offices, dates, or facts.
- If a question is about something you have no tool or view for (e.g. login/activity history), say plainly that that information isn't available to you yet. Do NOT guess, and do NOT fabricate a reason or describe how the data is supposedly managed.
${rushGuidance}${adminGuidance ? `\n${adminGuidance}` : ''}
- Always refer to the organization as Beta Theta Pi and the chapter as Alpha Nu — never any other fraternity.
- Keep answers short and skimmable; use markdown lists when helpful.`
  }

  /**
   * The agent loop: let Gemini orchestrate tool calls, then synthesize a final
   * answer. Members surfaced by any tool are hydrated into result cards; the
   * model's final text becomes the conversational answer.
   */
  private async runAgent(
    query: string,
    ctx: AskContext,
  ): Promise<{
    response: Omit<AskResponseDto, 'trace'>
    steps: number
    toolsUsed: string[]
    sqlQueries: string[]
  }> {
    const genAI = this.genAI!
    const tier: SqlTier = ctx.isAdmin ? 'admin' : 'safe'
    const includeRush = ctx.canSeeRush === true || ctx.isAdmin
    const tools = [{ functionDeclarations: this.agentToolDeclarations() }]
    const systemInstruction = this.agentSystemInstruction(tier, includeRush)

    const collectedPersons = new Map<string, Person>()
    const sourcesById = new Map<string, NewsletterSourceDto>()
    const sqlQueries: string[] = []
    const toolsUsed: string[] = []

    const contents: Content[] = [{ role: 'user', parts: [{ text: query }] }]

    let finalText: string | null = null
    let steps = 0

    while (steps < MAX_AGENT_STEPS) {
      steps++
      const result = await genAI.models.generateContent({
        model: AGENT_MODEL,
        contents,
        config: { tools, systemInstruction, temperature: 0.2 },
      })

      const calls = result.functionCalls ?? []
      if (!calls.length) {
        finalText = result.text ?? null
        break
      }

      // Preserve the model's turn (function-call parts + any thought signatures).
      const modelContent = result.candidates?.[0]?.content
      if (modelContent) contents.push(modelContent)
      else contents.push({ role: 'model', parts: calls.map((c) => ({ functionCall: c })) })

      // Execute all requested tools in parallel — independent calls cost one step.
      const responseParts: Part[] = await Promise.all(
        calls.map(async (call) => {
          const name = call.name ?? 'unknown'
          toolsUsed.push(name)
          let toolResponse: Record<string, unknown>
          try {
            toolResponse = await this.executeAgentTool(name, call.args ?? {}, {
              collectedPersons,
              sourcesById,
              sqlQueries,
              tier,
              includeRush,
            })
          } catch (err: any) {
            toolResponse = { error: err?.message ?? 'tool execution failed' }
          }
          return { functionResponse: { name, response: toolResponse } }
        }),
      )

      contents.push({ role: 'user', parts: responseParts })
    }

    // Hit the step ceiling without a textual answer: force one final, tool-free pass.
    if (finalText === null) {
      const finalResult = await genAI.models.generateContent({
        model: AGENT_MODEL,
        contents: [
          ...contents,
          {
            role: 'user',
            parts: [
              {
                text: 'Provide your best final answer now using the information gathered above. If something could not be determined, say so briefly.',
              },
            ],
          },
        ],
        config: { systemInstruction, temperature: 0.3 },
      })
      finalText = finalResult.text ?? null
    }

    const candidates = await this.hydrateCandidates([...collectedPersons.values()])
    const sources = [...sourcesById.values()].sort(
      (a, b) => b.year - a.year || (a.season === 'fall' ? -1 : 1),
    )

    const hasResults = candidates.length > 0
    const answer = finalText && finalText.trim() ? finalText.trim() : null
    const queryType = hasResults ? (answer ? 'mixed' : 'member_directory') : 'site_content'

    return {
      response: {
        interpretation: query,
        queryType,
        answer:
          answer ?? (hasResults ? null : "I couldn't find anything relevant to that question."),
        sources,
        results: candidates,
        totalDbMatches: candidates.length,
      },
      steps,
      toolsUsed,
      sqlQueries,
    }
  }

  private async executeAgentTool(
    name: string,
    args: Record<string, unknown>,
    collectors: {
      collectedPersons: Map<string, Person>
      sourcesById: Map<string, NewsletterSourceDto>
      sqlQueries: string[]
      tier: SqlTier
      includeRush: boolean
    },
  ): Promise<Record<string, unknown>> {
    switch (name) {
      case 'search_members':
        return this.toolSearchMembers(args, collectors.collectedPersons)
      case 'get_exec_history':
        return this.toolGetExecHistory(args, collectors.collectedPersons)
      case 'find_relatives':
        return this.toolFindRelatives(args, collectors.collectedPersons)
      case 'find_relationships':
        return this.toolFindRelationships(args, collectors.collectedPersons)
      case 'search_knowledge':
        return this.toolSearchKnowledge(args, collectors.sourcesById)
      case 'run_sql':
        return this.toolRunSql(args, collectors.tier, collectors.includeRush, collectors.sqlQueries)
      default:
        return { error: `Unknown tool: ${name}` }
    }
  }

  /**
   * Execute an LLM-generated read-only SQL query against the masked views.
   * Validation/execution errors are returned (not thrown) so the agent can read
   * the message and self-correct on a subsequent step.
   */
  private async toolRunSql(
    args: Record<string, unknown>,
    tier: SqlTier,
    includeRush: boolean,
    sqlQueries: string[],
  ): Promise<Record<string, unknown>> {
    const sql = asString(args.sql)
    if (!sql) return { error: 'Provide a SQL SELECT in the "sql" argument.' }

    try {
      const { rows, sql: executedSql } = await this.woogleSqlService.run(sql, tier, includeRush)
      sqlQueries.push(executedSql)
      return { rowCount: rows.length, rows }
    } catch (err: any) {
      // Record the attempt for the admin trace even when it fails validation.
      sqlQueries.push(`-- rejected: ${sql}`)
      const prefix = err instanceof SqlValidationError ? 'Invalid query' : 'Query failed'
      this.logger.warn('WoogleSql tool error', { tier, message: err?.message })
      return { error: `${prefix}: ${err?.message ?? 'unknown error'}` }
    }
  }

  private baseFilters(): ParsedFilters {
    return {
      queryType: 'member_directory',
      cityFilter: null,
      cityFilters: null,
      stateFilter: null,
      pledgeClassYearMin: null,
      pledgeClassYearMax: null,
      nameFragment: null,
      needsProfessionalData: false,
      professionalCriteria: null,
      execPosition: null,
      execIsCurrent: false,
      execYear: null,
      interpretation: '',
    }
  }

  /** Privacy-masked lean member view handed to the model for reasoning. */
  private leanMember(p: Person): Record<string, unknown> {
    return {
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      city: p.shareAddressWithLoggedInMembers ? (p.city ?? null) : null,
      state: p.shareAddressWithLoggedInMembers ? (p.state ?? null) : null,
      pledgeClassYear: p.pledgeClassYear ?? null,
    }
  }

  private async toolSearchMembers(
    args: Record<string, unknown>,
    collected: Map<string, Person>,
  ): Promise<Record<string, unknown>> {
    const filters = this.baseFilters()
    filters.nameFragment = asString(args.nameFragment)
    filters.cityFilters = asStringArray(args.cityFilters)
    filters.stateFilter = asString(args.stateFilter)
    filters.pledgeClassYearMin = asInt(args.pledgeClassYearMin)
    filters.pledgeClassYearMax = asInt(args.pledgeClassYearMax)

    const people = await this.queryPeople(filters, QUERY_LIMIT)
    for (const p of people) collected.set(p.id, p)
    return {
      count: people.length,
      members: people.slice(0, TOOL_RESULT_CAP).map((p) => this.leanMember(p)),
    }
  }

  private async toolGetExecHistory(
    args: Record<string, unknown>,
    collected: Map<string, Person>,
  ): Promise<Record<string, unknown>> {
    const filters = this.baseFilters()
    filters.queryType = 'exec_lookup'
    filters.execPosition = asString(args.position)
    filters.execYear = asInt(args.year)
    filters.execIsCurrent = args.isCurrent === true

    const persons = await this.queryExecTeam(filters)
    for (const p of persons) collected.set(p.id, p)

    const assignments = await this.loadExecAssignments(persons.map((p) => p.id))
    const byPerson = new Map<
      string,
      Array<{ position: string; term: string; isCurrent: boolean }>
    >()
    for (const a of assignments) {
      const list = byPerson.get(a.personId!) ?? []
      list.push({
        position: a.execPosition?.displayName ?? 'Unknown',
        term: a.execTerm ? `${a.execTerm.season} ${a.execTerm.year}` : 'unknown',
        isCurrent: a.execTerm?.isCurrent ?? false,
      })
      byPerson.set(a.personId!, list)
    }

    const officers = persons.slice(0, TOOL_RESULT_CAP).map((p) => ({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      pledgeClassYear: p.pledgeClassYear ?? null,
      offices: byPerson.get(p.id) ?? [],
    }))

    // Make the result conclusive so the agent doesn't re-query (e.g. via run_sql)
    // when an office is simply vacant. Always state the current term and whether
    // the requested position is filled.
    const result: Record<string, unknown> = { count: persons.length, officers }

    if (filters.execIsCurrent) {
      const currentTerm = await this.execTermModel.findOne({ where: { isCurrent: true } })
      result.currentTerm = currentTerm
        ? (currentTerm.label ?? `${currentTerm.season} ${currentTerm.year}`)
        : null
      if (!currentTerm) {
        result.note =
          'No exec term is marked current in the system. This is authoritative — do not retry with run_sql.'
        return result
      }
    }

    if (filters.execPosition && persons.length === 0) {
      const scope = filters.execIsCurrent
        ? 'in the current term'
        : filters.execYear != null
          ? `in ${filters.execYear}`
          : 'on record'
      result.note =
        `No "${filters.execPosition}" officer is ${scope}; treat this office as vacant. ` +
        'This is authoritative — do not retry with run_sql or another tool.'
    }

    return result
  }

  private async toolFindRelatives(
    args: Record<string, unknown>,
    collected: Map<string, Person>,
  ): Promise<Record<string, unknown>> {
    const mode = asString(args.mode)
    const filters = this.baseFilters()
    filters.nameFragment = asString(args.nameFragment)
    filters.pledgeClassYearMin = asInt(args.pledgeClassYearMin)
    filters.pledgeClassYearMax = asInt(args.pledgeClassYearMax)

    let persons: Person[]
    if (mode === 'legacy') {
      filters.queryType = 'legacy_lookup'
      persons = await this.queryLegacyMembers()
    } else {
      filters.queryType = 'parent_lookup'
      persons = await this.queryParents(filters)
    }
    for (const p of persons) collected.set(p.id, p)
    return {
      mode: mode === 'legacy' ? 'legacy' : 'parents',
      count: persons.length,
      members: persons.slice(0, TOOL_RESULT_CAP).map((p) => this.leanMember(p)),
    }
  }

  /** Find directory people (members OR parents/non-members) by a name fragment. */
  private async findPeopleByName(nameFragment: string): Promise<Person[]> {
    const parts = nameFragment.trim().split(/\s+/)
    const where =
      parts.length >= 2
        ? {
            [Op.and]: [
              { firstName: { [Op.iLike]: `%${parts[0]}%` } },
              { lastName: { [Op.iLike]: `%${parts[parts.length - 1]}%` } },
            ],
          }
        : {
            [Op.or]: [
              { firstName: { [Op.iLike]: `%${nameFragment}%` } },
              { lastName: { [Op.iLike]: `%${nameFragment}%` } },
            ],
          }
    return this.personModel.findAll({ where, limit: 25 })
  }

  /**
   * List one person's family connections with each counterpart's role relative
   * to them (Son, Parent, Brother, …). Handles both storage directions and works
   * for non-member parents. Member counterparts are added as result cards.
   */
  private async toolFindRelationships(
    args: Record<string, unknown>,
    collected: Map<string, Person>,
  ): Promise<Record<string, unknown>> {
    const name = asString(args.personName)
    if (!name) return { error: 'Provide personName.' }

    const matched = await this.findPeopleByName(name)
    if (!matched.length) return { matches: [], connections: [] }

    const rels = await this.loadRelationships(matched.map((p) => p.id))

    const connections: Array<Record<string, unknown>> = []
    const counterpartIds = new Set<string>()
    for (const r of rels) {
      for (const person of matched) {
        let viewerIsFrom: boolean
        let counterpart: Person | undefined
        if (r.fromPersonId === person.id) {
          viewerIsFrom = true
          counterpart = r.toPerson
        } else if (r.toPersonId === person.id) {
          viewerIsFrom = false
          counterpart = r.fromPerson
        } else {
          continue
        }
        if (!counterpart) continue

        const counterpartIsMember = !!counterpart.isMember
        connections.push({
          person: `${person.firstName} ${person.lastName}`,
          counterpart: `${counterpart.firstName} ${counterpart.lastName}`,
          // counterpart is the {counterpartRole} of `person`
          counterpartRole: viewerCounterpartRoleLabel(r.relationshipType, viewerIsFrom),
          counterpartPledgeYear: counterpart.pledgeClassYear ?? null,
          counterpartIsMember,
          // "Legacy" = both ends of the connection are chapter members.
          isLegacy: !!person.isMember && counterpartIsMember,
        })
        counterpartIds.add(counterpart.id)
      }
    }

    // Surface member counterparts as profile cards.
    if (counterpartIds.size) {
      const members = await this.personModel.findAll({
        where: { id: { [Op.in]: [...counterpartIds] }, isMember: true },
      })
      for (const m of members) collected.set(m.id, m)
    }

    return {
      matches: matched.map((p) => ({
        name: `${p.firstName} ${p.lastName}`,
        isMember: p.isMember,
        isParent: p.isParent,
        pledgeClassYear: p.pledgeClassYear ?? null,
      })),
      connections,
    }
  }

  private async toolSearchKnowledge(
    args: Record<string, unknown>,
    sourcesById: Map<string, NewsletterSourceDto>,
  ): Promise<Record<string, unknown>> {
    const q = asString(args.query) ?? ''
    if (!q) return { chunks: [] }

    // Over-fetch + LLM-rerank to maximize precision for the agent's single,
    // well-formed query, returning fewer but higher-quality passages.
    const { chunks } = await this.retrievalService.search(q, 12, undefined, { rerank: true })
    if (!chunks.length) return { chunks: [] }

    // Collect newsletter sources for citation (exclude synthetic *_meta ids).
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const newsletterIds = [
      ...new Set(
        chunks
          .filter((c) => c.sourceType === 'newsletter' && c.sourceId && UUID_RE.test(c.sourceId))
          .map((c) => c.sourceId as string),
      ),
    ].filter((id) => !sourcesById.has(id))

    if (newsletterIds.length) {
      const newsletters = await this.newsletterModel.findAll({
        where: { id: newsletterIds },
        attributes: ['id', 'season', 'year'],
      })
      for (const n of newsletters) {
        sourcesById.set(n.id, { id: n.id, season: n.season, year: n.year, title: null })
      }
    }

    return {
      chunks: chunks.slice(0, TOOL_RESULT_CAP).map((c) => ({
        sourceType: c.sourceType,
        content: c.content,
      })),
    }
  }

  /**
   * Hydrate Person rows into full result cards (exec history + relationships),
   * applying the same per-field privacy masking as the rest of the API.
   */
  private async hydrateCandidates(persons: Person[]): Promise<AlumniResultDto[]> {
    if (!persons.length) return []
    const personIds = persons.map((p) => p.id)
    const [assignments, relationships] = await Promise.all([
      this.loadExecAssignments(personIds),
      this.loadRelationships(personIds),
    ])

    const assignmentsByPersonId = new Map<string, OfficeHistoryItemDto[]>()
    for (const a of assignments) {
      const list = assignmentsByPersonId.get(a.personId!) ?? []
      list.push({
        position: a.execPosition?.displayName ?? 'Unknown',
        season: a.execTerm?.season ?? 'fall',
        year: a.execTerm?.year ?? 0,
        isCurrent: a.execTerm?.isCurrent ?? false,
      })
      assignmentsByPersonId.set(a.personId!, list)
    }

    const relationshipsByPersonId = new Map<string, RelationshipItemDto[]>()
    for (const r of relationships) {
      if (r.fromPersonId && personIds.includes(r.fromPersonId)) {
        const list = relationshipsByPersonId.get(r.fromPersonId) ?? []
        const related = r.toPerson
        if (related) {
          list.push({
            relatedPersonId: related.id,
            relatedPersonName: `${related.firstName} ${related.lastName}`,
            relatedPersonPledgeYear: related.pledgeClassYear ?? null,
            relationshipType: r.relationshipType ?? null,
            direction: 'from',
          })
        }
        relationshipsByPersonId.set(r.fromPersonId, list)
      }
      if (r.toPersonId && personIds.includes(r.toPersonId)) {
        const list = relationshipsByPersonId.get(r.toPersonId) ?? []
        const related = r.fromPerson
        if (related) {
          list.push({
            relatedPersonId: related.id,
            relatedPersonName: `${related.firstName} ${related.lastName}`,
            relatedPersonPledgeYear: related.pledgeClassYear ?? null,
            relationshipType: r.relationshipType ?? null,
            direction: 'to',
          })
        }
        relationshipsByPersonId.set(r.toPersonId, list)
      }
    }

    return persons.map((p) =>
      this.candidateToDto({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        city: p.shareAddressWithLoggedInMembers ? (p.city ?? null) : null,
        state: p.shareAddressWithLoggedInMembers ? (p.state ?? null) : null,
        pledgeClassYear: p.pledgeClassYear ?? null,
        linkedinProfileUrl: p.shareLinkedInWithLoggedInMembers
          ? (p.linkedinProfileUrl ?? null)
          : null,
        email: p.shareEmailWithLoggedInMembers ? (p.personalEmail ?? null) : null,
        employer: p.shareEmployerWithLoggedInMembers ? (p.employer ?? null) : null,
        jobTitle: p.shareEmployerWithLoggedInMembers ? (p.jobTitle ?? null) : null,
        profileHeadshotFilePath: p.profileHeadshotFilePath ?? null,
        shareAddress: p.shareAddressWithLoggedInMembers,
        shareEmail: p.shareEmailWithLoggedInMembers,
        shareLinkedIn: p.shareLinkedInWithLoggedInMembers,
        officeHistory: assignmentsByPersonId.get(p.id) ?? [],
        relationships: relationshipsByPersonId.get(p.id) ?? [],
      }),
    )
  }

  // ---------------------------------------------------------------------------
  // Phase-2: enrich a set of already-returned results
  // ---------------------------------------------------------------------------

  async enrich(dto: EnrichRequestDto): Promise<EnrichResponseDto> {
    const enrichmentMap = await this.enrichmentService.enrichBatch(dto.people)

    const enriched = dto.people.map((p) => {
      const e = enrichmentMap.get(p.id)
      return {
        id: p.id,
        enriched: e?.enriched ?? false,
        employer: e?.employer ?? null,
        jobTitle: e?.jobTitle ?? null,
        industry: e?.industry ?? null,
        headline: e?.headline ?? null,
        linkedinProfileUrl: p.linkedinProfileUrl ?? e?.linkedinUrl ?? null,
        linkedinUrlDiscovered: e?.linkedinUrl ?? null,
        enrichmentSource: e?.source ?? null,
        enrichmentConfidence: e?.confidence ?? null,
      }
    })

    const enrichedCount = enriched.filter((e) => e.enriched).length

    let finalResults: PersonEnrichResultDto[]
    let enrichmentSummary: string | null = null

    if (dto.professionalCriteria && enrichedCount > 0) {
      const filtered = await this.filterByProfessionalCriteria(
        enriched.filter((e) => e.enriched),
        dto.professionalCriteria,
      )
      const matchMap = new Map(filtered.map((c) => [c.id, c.matchReason]))

      finalResults = enriched.map((e) => ({
        ...e,
        matchReason: matchMap.get(e.id) ?? null,
        excluded: e.enriched && !matchMap.has(e.id),
      }))

      const matchCount = filtered.length
      enrichmentSummary =
        matchCount > 0
          ? `${matchCount} alumni confirmed matching "${dto.professionalCriteria}"`
          : `Couldn't confirm matches for "${dto.professionalCriteria}" — showing enriched profiles for review`
    } else {
      finalResults = enriched.map((e) => ({
        ...e,
        matchReason: null,
        excluded: false,
      }))

      enrichmentSummary =
        enrichedCount > 0
          ? `Professional info found for ${enrichedCount} of ${dto.people.length} alumni`
          : `No professional info found for ${dto.people.length} alumni`
    }

    return { results: finalResults, enrichmentSummary }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private candidateToDto(c: FullProfileCandidate): AlumniResultDto {
    return {
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      city: c.city,
      state: c.state,
      pledgeClassYear: c.pledgeClassYear,
      linkedinProfileUrl: c.linkedinProfileUrl,
      email: c.email,
      employer: c.employer,
      jobTitle: c.jobTitle,
      profileHeadshotFilePath: c.profileHeadshotFilePath,
      officeHistory: c.officeHistory,
      relationships: c.relationships,
    }
  }

  private async parseQuery(query: string): Promise<ParsedFilters> {
    const prompt = `You are a query parser for a fraternity alumni chapter website called Kansas Beta.

The site has two kinds of knowledge:
1. MEMBER DIRECTORY: people (alumni, parents), pledge class years, cities, states, exec office history, legacy/family relationships.
2. SITE CONTENT: chapter events (calendar, rush), newsletters, exec team rosters, history, house mom, rush info pages.

Available member database fields: firstName, lastName, city (mailing address), state (2-letter US code), pledgeClassYear (integer).

Return ONLY valid JSON (no markdown, no code fences):
{
  "queryType": "member_directory" | "site_content" | "mixed" | "exec_lookup" | "parent_lookup" | "legacy_lookup",
  "cityFilter": string | null,
  "cityFilters": string[] | null,
  "stateFilter": string | null,
  "pledgeClassYearMin": number | null,
  "pledgeClassYearMax": number | null,
  "nameFragment": string | null,
  "needsProfessionalData": boolean,
  "professionalCriteria": string | null,
  "execPosition": string | null,
  "execIsCurrent": boolean,
  "execYear": number | null,
  "interpretation": string
}

Rules:
- queryType:
  - "member_directory": questions finding alumni by name, location, or pledge class.
  - "site_content": questions about events, history, newsletters, rush info, chapter activities. NOT exec officers.
  - "mixed": BOTH member directory AND site content needed simultaneously.
  - "exec_lookup": ANY question about who held/holds a chapter officer position (president, VP, treasurer, secretary, IFC, etc.), or the current exec team. Use this whenever querying by role/position title.
  - "parent_lookup": questions asking who the PARENTS are of specific members or a pledge class (e.g. "who are the parents of class of 2019", "who is John Smith's parent", "show all parents").
  - "legacy_lookup": questions about legacy members — members who have a family/relationship connection to another chapter member (e.g. "show legacy members", "who are the legacy members", "which members have legacy connections").
- cityFilter: lowercase city substring for simple single-city queries.
- cityFilters: for metro areas spanning suburbs, return array of substrings. Set cityFilter null when used.
- stateFilter: 2-letter uppercase code only when a specific state is explicitly mentioned.
- pledgeClassYearMin/Max: for "class of 2010" set both to 2010; for "around 2010" use 2008-2012. Also used in parent_lookup to identify which class's parents to find.
- nameFragment: the person's name. For parent_lookup, this is the MEMBER whose parent we want.
- needsProfessionalData: true ONLY when query asks to FILTER by employer, job title, or industry.
- professionalCriteria: only when needsProfessionalData is true AND the goal is to filter results.
- execPosition: for exec_lookup only — lowercase position title (e.g. "president", "treasurer", "vice president"). Null if querying all positions.
- execIsCurrent: true for exec_lookup only when asking about CURRENT officers ("who is the current president", "current exec team").
- execYear: for exec_lookup only — the specific exec term year (e.g. 2019). Null if not specified.
- interpretation: brief human-readable summary of what was searched.

Examples:
- "who is the current president" -> queryType: "exec_lookup", execPosition: "president", execIsCurrent: true, execYear: null
- "who was president in 2022" -> queryType: "exec_lookup", execPosition: "president", execYear: 2022, execIsCurrent: false
- "show me the current exec team" -> queryType: "exec_lookup", execPosition: null, execIsCurrent: true
- "who has served as treasurer" -> queryType: "exec_lookup", execPosition: "treasurer", execIsCurrent: false, execYear: null
- "who are the parents of the class of 2019" -> queryType: "parent_lookup", pledgeClassYearMin: 2019, pledgeClassYearMax: 2019
- "who is John Smith parent" -> queryType: "parent_lookup", nameFragment: "John Smith"
- "show all parents" -> queryType: "parent_lookup"
- "show legacy members" -> queryType: "legacy_lookup"
- "which members have legacy connections" -> queryType: "legacy_lookup"
- "Joe Simmons LinkedIn" -> queryType: "member_directory", needsProfessionalData: true, nameFragment: "Joe Simmons"
- "when is the next rush event" -> queryType: "site_content"
- "summarize the Buddy Bianca article" -> queryType: "site_content"
- "who was president in 2019 and when is homecoming" -> queryType: "mixed", execPosition: "president", execYear: 2019
- "members in Kansas City" -> queryType: "member_directory", cityFilters: ["kansas city", "overland park", "leawood", "olathe", "lenexa", "shawnee", "lee s summit", "prairie village"]

User query: "${query}"`

    const result = await this.genAI!.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json', temperature: 0 },
    })

    const raw = result.text ?? '{}'
    try {
      return JSON.parse(raw) as ParsedFilters
    } catch {
      this.logger.warn('Failed to parse Gemini query response', { raw })
      return {
        queryType: 'member_directory',
        cityFilter: null,
        cityFilters: null,
        stateFilter: null,
        pledgeClassYearMin: null,
        pledgeClassYearMax: null,
        nameFragment: null,
        needsProfessionalData: false,
        professionalCriteria: null,
        execPosition: null,
        execIsCurrent: false,
        execYear: null,
        interpretation: query,
      }
    }
  }

  private async queryPeople(filters: ParsedFilters, limit: number): Promise<Person[]> {
    const and: any[] = [{ isMember: true }]

    if (!filters.nameFragment) {
      if (filters.cityFilters?.length) {
        and.push({
          [Op.or]: filters.cityFilters.map((c) => ({ city: { [Op.iLike]: `%${c}%` } })),
        })
      } else if (filters.cityFilter) {
        and.push({ city: { [Op.iLike]: `%${filters.cityFilter}%` } })
      }
    }
    if (filters.stateFilter) {
      and.push({ state: filters.stateFilter.toUpperCase() })
    }
    if (filters.pledgeClassYearMin != null && filters.pledgeClassYearMax != null) {
      and.push({
        pledgeClassYear: {
          [Op.between]: [filters.pledgeClassYearMin, filters.pledgeClassYearMax],
        },
      })
    } else if (filters.pledgeClassYearMin != null) {
      and.push({ pledgeClassYear: { [Op.gte]: filters.pledgeClassYearMin } })
    } else if (filters.pledgeClassYearMax != null) {
      and.push({ pledgeClassYear: { [Op.lte]: filters.pledgeClassYearMax } })
    }

    if (filters.nameFragment) {
      const parts = filters.nameFragment.trim().split(/\s+/)
      if (parts.length >= 2) {
        and.push({ firstName: { [Op.iLike]: `%${parts[0]}%` } })
        and.push({ lastName: { [Op.iLike]: `%${parts[parts.length - 1]}%` } })
      } else {
        and.push({
          [Op.or]: [
            { firstName: { [Op.iLike]: `%${filters.nameFragment}%` } },
            { lastName: { [Op.iLike]: `%${filters.nameFragment}%` } },
          ],
        })
      }
    }

    return this.personModel.findAll({
      where: { [Op.and]: and },
      order: [
        ['lastName', 'ASC'],
        ['firstName', 'ASC'],
      ],
      limit,
    })
  }

  /**
   * Query exec officers by position, year, or current status.
   * Joins exec_assignments → exec_terms → exec_positions and returns the
   * associated Person records.
   */
  private async queryExecTeam(filters: ParsedFilters): Promise<Person[]> {
    const termWhere: Record<string, any> = {}
    if (filters.execIsCurrent) termWhere.isCurrent = true
    if (filters.execYear != null) termWhere.year = filters.execYear

    const positionWhere: Record<string | symbol, any> = {}
    if (filters.execPosition) {
      // Match precisely so "president" does NOT also match "Vice President".
      // Try the canonical code (e.g. "vice president" -> "vice_president") and an
      // exact (non-substring) case-insensitive displayName match.
      const norm = filters.execPosition.trim().toLowerCase()
      const code = norm.replace(/\s+/g, '_')
      positionWhere[Op.or] = [{ code }, { displayName: { [Op.iLike]: norm } }]
    }

    const assignments = await this.execAssignmentModel.findAll({
      where: { personId: { [Op.ne]: null } },
      include: [
        {
          model: ExecTerm,
          where: Object.keys(termWhere).length ? termWhere : undefined,
          required: true,
        },
        {
          model: ExecPosition,
          where: Object.keys(positionWhere).length ? positionWhere : undefined,
          required: true,
        },
      ],
    })

    const personIds = [...new Set(assignments.map((a) => a.personId!).filter(Boolean))]
    if (!personIds.length) return []

    return this.personModel.findAll({
      where: { id: { [Op.in]: personIds } },
      order: [
        ['lastName', 'ASC'],
        ['firstName', 'ASC'],
      ],
    })
  }

  /**
   * Find parents linked to members matching the given filters.
   *
   * Identifies parents by relationship type ('parent') rather than the isParent
   * flag, which may be inconsistently set. Handles both storage directions:
   *   - from=Parent, to=Member, type='parent'
   *   - from=Member, to=Parent, type='son'
   *
   * - If pledgeClassYear or nameFragment: find those members then traverse
   *   person_relationships to their parents.
   * - Otherwise: return all persons linked via parent-type relationships.
   */
  private async queryParents(filters: ParsedFilters): Promise<Person[]> {
    const PARENT_AS_FROM_TYPES = [
      'parent',
      'grandparent',
      'great_grandparent',
      'great_great_grandparent',
    ]
    const PARENT_AS_TO_TYPES = ['son', 'grandchild', 'great_grandchild', 'great_great_grandchild']

    // No member criteria — return all people who appear as a parent in any relationship
    if (!filters.nameFragment && filters.pledgeClassYearMin == null) {
      const [fromRows, toRows] = await Promise.all([
        this.relationshipModel.findAll({
          where: { relationshipType: { [Op.in]: PARENT_AS_FROM_TYPES } },
          attributes: ['fromPersonId'],
        }),
        this.relationshipModel.findAll({
          where: { relationshipType: { [Op.in]: PARENT_AS_TO_TYPES } },
          attributes: ['toPersonId'],
        }),
      ])
      const parentIds = [
        ...new Set([...fromRows.map((r) => r.fromPersonId), ...toRows.map((r) => r.toPersonId)]),
      ]
      if (!parentIds.length) return []
      return this.personModel.findAll({
        where: { id: { [Op.in]: parentIds } },
        order: [
          ['lastName', 'ASC'],
          ['firstName', 'ASC'],
        ],
        limit: QUERY_LIMIT,
      })
    }

    // Find members matching the criteria
    const memberWhere: any[] = [{ isMember: true }]
    if (filters.pledgeClassYearMin != null && filters.pledgeClassYearMax != null) {
      memberWhere.push({
        pledgeClassYear: { [Op.between]: [filters.pledgeClassYearMin, filters.pledgeClassYearMax] },
      })
    } else if (filters.pledgeClassYearMin != null) {
      memberWhere.push({ pledgeClassYear: { [Op.gte]: filters.pledgeClassYearMin } })
    } else if (filters.pledgeClassYearMax != null) {
      memberWhere.push({ pledgeClassYear: { [Op.lte]: filters.pledgeClassYearMax } })
    }
    if (filters.nameFragment) {
      const parts = filters.nameFragment.trim().split(/\s+/)
      if (parts.length >= 2) {
        memberWhere.push({ firstName: { [Op.iLike]: `%${parts[0]}%` } })
        memberWhere.push({ lastName: { [Op.iLike]: `%${parts[parts.length - 1]}%` } })
      } else {
        memberWhere.push({
          [Op.or]: [
            { firstName: { [Op.iLike]: `%${filters.nameFragment}%` } },
            { lastName: { [Op.iLike]: `%${filters.nameFragment}%` } },
          ],
        })
      }
    }

    const members = await this.personModel.findAll({
      where: { [Op.and]: memberWhere },
      attributes: ['id'],
      limit: QUERY_LIMIT,
    })
    if (!members.length) return []
    const memberIds = members.map((m) => m.id)

    // Find parent-type relationships: parent is 'from', member is 'to'
    // Also handle reverse: member is 'from', parent is 'to' with child-type
    const [fromRows, toRows] = await Promise.all([
      this.relationshipModel.findAll({
        where: {
          toPersonId: { [Op.in]: memberIds },
          relationshipType: { [Op.in]: PARENT_AS_FROM_TYPES },
        },
        attributes: ['fromPersonId'],
      }),
      this.relationshipModel.findAll({
        where: {
          fromPersonId: { [Op.in]: memberIds },
          relationshipType: { [Op.in]: PARENT_AS_TO_TYPES },
        },
        attributes: ['toPersonId'],
      }),
    ])

    const parentIds = [
      ...new Set([...fromRows.map((r) => r.fromPersonId), ...toRows.map((r) => r.toPersonId)]),
    ]
    if (!parentIds.length) return []

    return this.personModel.findAll({
      where: { id: { [Op.in]: parentIds } },
      order: [
        ['lastName', 'ASC'],
        ['firstName', 'ASC'],
      ],
    })
  }

  /**
   * Find all members who have at least one relationship where BOTH endpoints
   * are chapter members — the definition of a "legacy" member.
   */
  private async queryLegacyMembers(): Promise<Person[]> {
    // Find relationships where both sides are members
    const legacyRelationships = await this.relationshipModel.findAll({
      include: [
        {
          model: Person,
          as: 'fromPerson',
          attributes: ['id'],
          where: { isMember: true },
          required: true,
        },
        {
          model: Person,
          as: 'toPerson',
          attributes: ['id'],
          where: { isMember: true },
          required: true,
        },
      ],
      attributes: ['fromPersonId', 'toPersonId'],
    })

    const legacyIds = new Set<string>()
    for (const r of legacyRelationships) {
      legacyIds.add(r.fromPersonId)
      legacyIds.add(r.toPersonId)
    }

    if (!legacyIds.size) return []

    return this.personModel.findAll({
      where: { id: { [Op.in]: [...legacyIds] }, isMember: true },
      order: [
        ['lastName', 'ASC'],
        ['firstName', 'ASC'],
      ],
      limit: QUERY_LIMIT,
    })
  }

  private async loadExecAssignments(personIds: string[]): Promise<ExecAssignment[]> {
    if (!personIds.length) return []
    return this.execAssignmentModel.findAll({
      where: { personId: { [Op.in]: personIds } },
      include: [
        { model: ExecTerm, required: true },
        { model: ExecPosition, required: true },
      ],
    })
  }

  private async loadRelationships(personIds: string[]): Promise<PersonRelationship[]> {
    if (!personIds.length) return []
    return this.relationshipModel.findAll({
      where: {
        [Op.or]: [{ fromPersonId: { [Op.in]: personIds } }, { toPersonId: { [Op.in]: personIds } }],
      },
      include: [
        {
          model: Person,
          as: 'fromPerson',
          attributes: ['id', 'firstName', 'lastName', 'pledgeClassYear', 'isMember'],
        },
        {
          model: Person,
          as: 'toPerson',
          attributes: ['id', 'firstName', 'lastName', 'pledgeClassYear', 'isMember'],
        },
      ],
    })
  }

  /**
   * Use Gemini to decompose a complex query into 2–5 focused sub-queries.
   * Falls back to the original query as a single-element array on any error.
   */
  private async decomposeQuery(query: string): Promise<string[]> {
    if (!this.genAI) return [query]

    const prompt = `You are a search query decomposer for a fraternity chapter website.
Break the following question into 2–5 specific sub-queries that, together, fully cover the original question.
Each sub-query should be a complete, standalone search phrase optimized for semantic vector search.
Return ONLY a valid JSON array of strings — no markdown, no explanation.

Examples:
- "Which newsletters discuss our 7 values?" → ["chapter values list", "newsletter brotherhood value", "newsletter scholarship value", "newsletter leadership value", "newsletter service value"]
- "Who are the current exec officers?" → ["current president exec officer", "current vice president exec officer", "current exec team roster", "current treasurer secretary exec"]

Question: "${query}"`

    try {
      const result = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json', temperature: 0 },
      })
      const parsed = JSON.parse(result.text ?? '[]')
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, 5) as string[]
      }
    } catch (err) {
      this.logger.warn('decomposeQuery failed, using original query', { err })
    }

    return [query]
  }

  /**
   * Retrieve relevant knowledge chunks and synthesize a natural-language answer
   * using Gemini. Used for site_content and mixed query types.
   * Runs multi-query decomposition to improve recall on broad questions.
   */
  private async generateRagAnswer(
    query: string,
  ): Promise<{ answer: string; sources: NewsletterSourceDto[] }> {
    if (!this.genAI) return { answer: 'AI service unavailable.', sources: [] }

    const subQueries = await this.decomposeQuery(query)

    this.logger.info('generateRagAnswer: sub-queries', { subQueries })

    // Run a parallel vector search for each sub-query
    const searchResults = await Promise.all(
      subQueries.map((q) => this.retrievalService.search(q, 25)),
    )

    // Merge and deduplicate by chunk ID, keeping highest similarity per chunk
    const chunkMap = new Map<string, (typeof searchResults)[0]['chunks'][0]>()
    for (const { chunks } of searchResults) {
      for (const chunk of chunks) {
        const existing = chunkMap.get(chunk.id)
        if (!existing || chunk.similarity > existing.similarity) {
          chunkMap.set(chunk.id, chunk)
        }
      }
    }

    const mergedChunks = [...chunkMap.values()].sort((a, b) => b.similarity - a.similarity)

    if (!mergedChunks.length) {
      return {
        answer:
          "I couldn't find relevant information in the site knowledge base for that question.",
        sources: [],
      }
    }

    const contextText = mergedChunks
      .map((c, i) => `[${i + 1}] (${c.sourceType}) ${c.content}`)
      .join('\n\n')

    // Extract unique newsletter IDs from matched chunks — exclude synthetic IDs like `uuid_meta`
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const newsletterIds = [
      ...new Set(
        mergedChunks
          .filter((c) => c.sourceType === 'newsletter' && c.sourceId && UUID_RE.test(c.sourceId))
          .map((c) => c.sourceId as string),
      ),
    ]

    // Look up newsletter metadata for sources
    const sources: NewsletterSourceDto[] = []
    if (newsletterIds.length) {
      const newsletters = await this.newsletterModel.findAll({
        where: { id: newsletterIds },
        attributes: ['id', 'season', 'year'],
      })
      for (const n of newsletters) {
        sources.push({ id: n.id, season: n.season, year: n.year, title: null })
      }
      // Sort by year desc, season (fall before spring)
      sources.sort((a, b) => b.year - a.year || (a.season === 'fall' ? -1 : 1))
    }

    this.logger.info('generateRagAnswer: merged chunks', {
      subQueryCount: subQueries.length,
      mergedCount: mergedChunks.length,
      newsletterSources: sources.length,
    })

    const prompt = `You are Woogle, the AI assistant for Kansas Beta chapter's alumni and member portal.
Answer the following question using ONLY the provided context. Be concise, helpful, and conversational.
If the context doesn't contain enough information to fully answer, say so clearly.

Context:
${contextText}

Question: ${query}

Answer:`

    const result = await this.genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.3 },
    })

    return {
      answer: result.text ?? "I couldn't generate an answer. Please try rephrasing your question.",
      sources,
    }
  }

  private async filterByProfessionalCriteria(
    enrichedPeople: Array<{
      id: string
      employer: string | null
      jobTitle: string | null
      industry: string | null
      headline: string | null
    }>,
    criteria: string,
  ): Promise<Array<{ id: string; matchReason: string | null }>> {
    if (!enrichedPeople.length || !this.genAI) return []

    const profileList = enrichedPeople.map((c) => ({
      id: c.id,
      employer: c.employer,
      jobTitle: c.jobTitle,
      industry: c.industry,
      headline: c.headline,
    }))

    const prompt = `You are filtering a list of alumni profiles based on professional criteria.

Criteria: "${criteria}"

Alumni profiles:
${JSON.stringify(profileList, null, 2)}

Return ONLY valid JSON array. Include people who plausibly match — be inclusive for partial data:
[{ "id": "...", "matchReason": "brief explanation e.g. VP at Goldman Sachs" }, ...]

If none match, return: []`

    const result = await this.genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json', temperature: 0 },
    })

    const raw = result.text ?? '[]'
    try {
      return JSON.parse(raw) as Array<{ id: string; matchReason: string | null }>
    } catch {
      this.logger.warn('Failed to parse Gemini filter response', { raw })
      return []
    }
  }
}
