import { Injectable } from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'
import { GoogleGenAI } from '@google/genai'
import { PdlService } from './pdl.service'
import { TavilyService, TavilyResult } from './tavily.service'

export interface EnrichmentResult {
  enriched: boolean
  source: 'pdl' | 'tavily' | 'none'
  employer: string | null
  jobTitle: string | null
  industry: string | null
  headline: string | null
  summary: string | null
  linkedinUrl: string | null
}

export interface PersonForEnrichment {
  id: string
  firstName: string
  lastName: string
  linkedinProfileUrl: string | null
  email?: string | null
  city?: string | null
  state?: string | null
}

@Injectable()
export class EnrichmentService {
  private genAI: GoogleGenAI | null = null

  constructor(
    private readonly pdl: PdlService,
    private readonly tavily: TavilyService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(EnrichmentService.name)
    const apiKey = process.env.GEMINI_API_KEY
    if (apiKey) {
      this.genAI = new GoogleGenAI({ apiKey })
    }
  }

  /**
   * Enrich a single person.
   * Waterfall: PDL (structured, high accuracy) → Tavily + Gemini (web search fallback).
   */
  async enrichOne(person: PersonForEnrichment): Promise<EnrichmentResult> {
    const empty: EnrichmentResult = {
      enriched: false,
      source: 'none',
      employer: null,
      jobTitle: null,
      industry: null,
      headline: null,
      summary: null,
      linkedinUrl: null,
    }

    // Tier 1: PDL — structured database with current job data
    if (this.pdl.isConfigured) {
      const pdlResult = await this.pdl.enrichPerson({
        firstName: person.firstName,
        lastName: person.lastName,
        city: person.city,
        state: person.state,
        email: person.email,
        linkedinUrl: person.linkedinProfileUrl,
      })

      if (pdlResult) {
        return {
          enriched: true,
          source: 'pdl',
          employer: pdlResult.employer,
          jobTitle: pdlResult.jobTitle,
          industry: pdlResult.industry,
          headline: pdlResult.headline,
          summary: null,
          linkedinUrl: null,
        }
      }
    }

    // Tier 2: Tavily web search + Gemini parsing
    if (!this.tavily.isConfigured || !this.genAI) return empty

    const searchResults = await this.tavily.searchProfessionalInfo(
      person.firstName,
      person.lastName,
      person.city,
      person.state,
    )

    if (!searchResults.length) return empty

    // Extract the first LinkedIn profile URL from search results, if any
    const discoveredLinkedInUrl =
      searchResults.find((r) => r.url?.includes('linkedin.com/in/'))?.url ?? null

    const professional = await this.parseProfessionalInfo(person, searchResults)
    if (!professional) return empty

    return {
      enriched: true,
      source: 'tavily',
      employer: professional.employer,
      jobTitle: professional.jobTitle,
      industry: professional.industry,
      headline: professional.headline,
      summary: null,
      linkedinUrl: person.linkedinProfileUrl ?? discoveredLinkedInUrl,
    }
  }

  /**
   * Enrich a batch of people sequentially to respect rate limits.
   */
  async enrichBatch(people: PersonForEnrichment[]): Promise<Map<string, EnrichmentResult>> {
    const results = new Map<string, EnrichmentResult>()

    for (const person of people) {
      results.set(person.id, await this.enrichOne(person))
      await new Promise((r) => setTimeout(r, 200))
    }

    return results
  }

  private async parseProfessionalInfo(
    person: PersonForEnrichment,
    searchResults: TavilyResult[],
  ): Promise<{
    employer: string | null
    jobTitle: string | null
    industry: string | null
    headline: string | null
  } | null> {
    const snippet = searchResults
      .map((r) => `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.content}`)
      .join('\n\n')

    const prompt = `Extract the current professional information for "${person.firstName} ${person.lastName}" from these web search results.

Search results:
${snippet}

Return ONLY valid JSON (no markdown):
{
  "employer": string | null,
  "jobTitle": string | null,
  "industry": string | null,
  "headline": string | null,
  "confidence": "high" | "medium" | "low"
}

Rules:
- employer: current company name, or null if not clearly found
- jobTitle: current role/title, or null if not clearly found
- industry: broad category (e.g. "Finance", "Technology", "Real Estate"), or null
- headline: short professional headline (e.g. "VP of Sales at Acme Corp"), or null
- confidence: "high" if you're certain this is the right person, "medium" if likely, "low" if uncertain
- If you cannot confidently identify the person, return null for all fields with confidence "low"`

    try {
      const result = await this.genAI!.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json', temperature: 0 },
      })

      const raw = result.text ?? 'null'
      const parsed = JSON.parse(raw)

      if (!parsed || parsed.confidence === 'low') {
        this.logger.info('EnrichmentService: low-confidence result skipped', {
          name: `${person.firstName} ${person.lastName}`,
        })
        return null
      }

      this.logger.info('EnrichmentService: professional info extracted', {
        name: `${person.firstName} ${person.lastName}`,
        employer: parsed.employer,
        jobTitle: parsed.jobTitle,
        confidence: parsed.confidence,
      })

      return {
        employer: parsed.employer ?? null,
        jobTitle: parsed.jobTitle ?? null,
        industry: parsed.industry ?? null,
        headline: parsed.headline ?? null,
      }
    } catch (err: any) {
      this.logger.warn('EnrichmentService: Gemini parse failed', {
        name: `${person.firstName} ${person.lastName}`,
        error: err?.message,
      })
      return null
    }
  }
}
