import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { Op } from 'sequelize'
import { PinoLogger } from 'nestjs-pino'
import { GoogleGenAI } from '@google/genai'
import { Person } from '../database/entities/person.entity'
import { EnrichmentService } from './enrichment/enrichment.service'
import type { AskQueryDto } from './dto/ask-query.dto'
import type {
  AskResponseDto,
  AlumniResultDto,
  EnrichRequestDto,
  EnrichResponseDto,
  PersonEnrichResultDto,
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
}

interface EnrichedCandidate {
  id: string
  firstName: string
  lastName: string
  city: string | null
  state: string | null
  pledgeClassYear: number | null
  linkedinProfileUrl: string | null
  email: string | null
  shareAddress: boolean
  shareEmail: boolean
  shareLinkedIn: boolean
  employer: string | null
  jobTitle: string | null
  industry: string | null
  headline: string | null
  summary: string | null
  enriched: boolean
}

/** Max alumni to pull from DB for queries that require professional enrichment. */
const PROFESSIONAL_QUERY_LIMIT = 25
/** Max alumni for structural-only queries (no enrichment needed). */
const STRUCTURAL_QUERY_LIMIT = 100

@Injectable()
export class AskService {
  private genAI: GoogleGenAI | null = null

  constructor(
    @InjectModel(Person)
    private readonly personModel: typeof Person,
    private readonly enrichmentService: EnrichmentService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AskService.name)
    const apiKey = process.env.GEMINI_API_KEY
    if (apiKey) {
      this.genAI = new GoogleGenAI({ apiKey })
    }
  }

  async ask(dto: AskQueryDto): Promise<AskResponseDto> {
    if (!this.genAI) {
      throw new ServiceUnavailableException('AI service is not configured (missing GEMINI_API_KEY)')
    }

    // Step 1: parse the natural language query into structured filters
    const filters = await this.parseQuery(dto.query)
    this.logger.info('Ask query parsed', { filters })

    // Step 2: query the database with structural filters
    const dbResults = await this.queryPeople(
      filters,
      filters.needsProfessionalData ? PROFESSIONAL_QUERY_LIMIT : STRUCTURAL_QUERY_LIMIT,
    )
    const totalDbMatches = dbResults.length

    if (totalDbMatches === 0) {
      return {
        interpretation: filters.interpretation,
        results: [],
        totalDbMatches: 0,
        isProfessionalQuery: filters.needsProfessionalData,
        enrichmentSummary: null,
        professionalCriteria: null,
        enrichPeople: [],
      }
    }

    // Step 3: return DB results immediately — enrichment happens in phase 2 (/ask/enrich)
    const candidates: EnrichedCandidate[] = dbResults.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      city: p.shareAddressWithLoggedInMembers ? (p.city ?? null) : null,
      state: p.shareAddressWithLoggedInMembers ? (p.state ?? null) : null,
      pledgeClassYear: p.pledgeClassYear ?? null,
      linkedinProfileUrl: p.shareLinkedInWithLoggedInMembers
        ? (p.linkedinProfileUrl ?? null)
        : null,
      email: p.shareEmailWithLoggedInMembers ? (p.email ?? null) : null,
      shareAddress: p.shareAddressWithLoggedInMembers,
      shareEmail: p.shareEmailWithLoggedInMembers,
      shareLinkedIn: p.shareLinkedInWithLoggedInMembers,
      employer: null,
      jobTitle: null,
      industry: null,
      headline: null,
      summary: null,
      enriched: false,
    }))

    return {
      interpretation: filters.interpretation,
      results: candidates.map(
        (c): AlumniResultDto => ({
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          city: c.city,
          state: c.state,
          pledgeClassYear: c.pledgeClassYear,
          linkedinProfileUrl: c.linkedinProfileUrl,
          email: c.email,
          enriched: false,
          employer: null,
          jobTitle: null,
          industry: null,
          matchReason: null,
        }),
      ),
      totalDbMatches,
      isProfessionalQuery: filters.needsProfessionalData,
      /** Enrichment metadata will be populated by phase 2 (/ask/enrich). */
      enrichmentSummary: null,
      /** Pass back filters needed for phase-2 enrichment call. */
      professionalCriteria: filters.professionalCriteria,
      enrichPeople: filters.needsProfessionalData
        ? dbResults.map((p) => ({
            id: p.id,
            firstName: p.firstName,
            lastName: p.lastName,
            linkedinProfileUrl: p.linkedinProfileUrl ?? null,
            email: p.email ?? null,
            city: p.city ?? null,
            state: p.state ?? null,
          }))
        : [],
    } as AskResponseDto & {
      professionalCriteria: string | null
      enrichPeople: Array<{
        id: string
        firstName: string
        lastName: string
        linkedinProfileUrl: string | null
        email: string | null
        city: string | null
        state: string | null
      }>
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async parseQuery(query: string): Promise<ParsedFilters> {
    const prompt = `You are a query parser for a fraternity alumni directory.

Available database fields: firstName, lastName, city (mailing address), state (2-letter US code), pledgeClassYear (integer).
Via web enrichment we can look up: current employer, job title, industry.

Return ONLY valid JSON (no markdown, no code fences):
{
  "cityFilter": string | null,
  "cityFilters": string[] | null,
  "stateFilter": string | null,
  "pledgeClassYearMin": number | null,
  "pledgeClassYearMax": number | null,
  "nameFragment": string | null,
  "needsProfessionalData": boolean,
  "professionalCriteria": string | null,
  "interpretation": string
}

Rules:
- cityFilter: lowercase city substring for simple single-city queries, e.g. "chicago".
- cityFilters: for metro areas that span many suburbs (e.g. "Kansas City", "Dallas", "Chicago", "New York", "Los Angeles"), return an array of lowercase city/suburb substrings covering the metro. Set cityFilter to null when cityFilters is used. Examples: "Kansas City" → ["kansas city", "overland park", "leawood", "olathe", "lenexa", "shawnee", "lee's summit", "prairie village", "independence", "blue springs", "liberty", "gladstone"]. "Chicago area" → ["chicago", "evanston", "naperville", "schaumburg", "aurora", "joliet", "oak park"]. For unambiguous single-city queries, leave null and use cityFilter instead.
- stateFilter: 2-letter uppercase code only when a specific state is explicitly mentioned (e.g. "alumni in Texas"). Do NOT infer state from city name alone — metro areas often span state lines (e.g. Kansas City spans KS and MO).
- pledgeClassYearMin/Max: for queries like "class of 2010" set both to 2010; for "around 2010" use 2008–2012.
- needsProfessionalData: true ONLY when the query asks to FILTER or FIND people based on their employer, job title, or industry (e.g. "who works in finance", "alumni at Google", "members in accounting"). Set to false for person lookups, LinkedIn profile requests, or any query that just asks about a specific named individual.
- professionalCriteria: only when needsProfessionalData is true AND the goal is to filter results — describe what professional attribute to filter by (e.g. "works in finance", "employed at a tech company"). Leave null for person lookups.
- interpretation: a brief human-readable summary, e.g. "Alumni in Chicago, IL who work in finance" or "Looking up Joe Simmons".

Examples:
- "Joe Simmons LinkedIn profile" → needsProfessionalData: true, nameFragment: "Joe Simmons", professionalCriteria: null
- "where does Steve Babb work" → needsProfessionalData: true, nameFragment: "Steve Babb", professionalCriteria: null
- "alumni who work in finance" → needsProfessionalData: true, professionalCriteria: "works in finance"
- "members at Goldman Sachs" → needsProfessionalData: true, professionalCriteria: "employed at Goldman Sachs"
- "find John Smith" → needsProfessionalData: false, nameFragment: "John Smith", professionalCriteria: null

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
        cityFilter: null,
        cityFilters: null,
        stateFilter: null,
        pledgeClassYearMin: null,
        pledgeClassYearMax: null,
        nameFragment: null,
        needsProfessionalData: false,
        professionalCriteria: null,
        interpretation: query,
      }
    }
  }

  private async queryPeople(filters: ParsedFilters, limit: number): Promise<Person[]> {
    const and: any[] = [{ isMember: true }]

    // Skip city filters when looking up a named person — city is enrichment context, not a DB constraint.
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
        pledgeClassYear: { [Op.between]: [filters.pledgeClassYearMin, filters.pledgeClassYearMax] },
      })
    } else if (filters.pledgeClassYearMin != null) {
      and.push({ pledgeClassYear: { [Op.gte]: filters.pledgeClassYearMin } })
    } else if (filters.pledgeClassYearMax != null) {
      and.push({ pledgeClassYear: { [Op.lte]: filters.pledgeClassYearMax } })
    }

    if (filters.nameFragment) {
      const parts = filters.nameFragment.trim().split(/\s+/)
      if (parts.length >= 2) {
        // Full name like "Steve Babb" — match first AND last separately
        and.push({ firstName: { [Op.iLike]: `%${parts[0]}%` } })
        and.push({ lastName: { [Op.iLike]: `%${parts[parts.length - 1]}%` } })
      } else {
        // Single token — match first OR last
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

  private async filterByProfessionalCriteria(
    candidates: EnrichedCandidate[],
    criteria: string,
  ): Promise<EnrichedCandidate[]> {
    const enriched = candidates.filter((c) => c.enriched)

    // If no LinkedIn data was retrieved at all, we can't verify professional
    // criteria — return empty rather than falsely implying everyone matches.
    if (enriched.length === 0) return []

    const profileList = enriched.map((c) => ({
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

    const result = await this.genAI!.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json', temperature: 0 },
    })

    const raw = result.text ?? '[]'
    let matches: Array<{ id: string; matchReason: string }> = []
    try {
      matches = JSON.parse(raw)
    } catch {
      this.logger.warn('Failed to parse Gemini filter response', { raw })
      return candidates
    }

    const matchMap = new Map(matches.map((m) => [m.id, m.matchReason]))

    // Only return people whose LinkedIn data confirmed the criteria.
    // Un-enriched people are excluded — no data means we can't verify.
    return enriched
      .filter((c) => matchMap.has(c.id))
      .map((c) => ({ ...c, matchReason: matchMap.get(c.id) ?? null }))
  }

  // ---------------------------------------------------------------------------
  // Phase-2: enrich a set of already-returned results
  // ---------------------------------------------------------------------------

  async enrich(dto: EnrichRequestDto): Promise<EnrichResponseDto> {
    const enrichmentMap = await this.enrichmentService.enrichBatch(dto.people)

    // Build per-person results
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
      }
    })

    const enrichedCount = enriched.filter((e) => e.enriched).length

    // Optional: filter by professional criteria if provided
    let finalResults: PersonEnrichResultDto[]
    let enrichmentSummary: string | null = null

    if (dto.professionalCriteria && enrichedCount > 0) {
      // Re-use the existing filter logic by building fake EnrichedCandidate objects
      const fakeCandidates = enriched
        .filter((e) => e.enriched)
        .map((e) => ({
          ...e,
          firstName: '',
          lastName: '',
          city: null,
          state: null,
          pledgeClassYear: null,
          email: null,
          shareAddress: false,
          shareEmail: false,
          shareLinkedIn: false,
          summary: null,
          enriched: true,
        }))

      const filtered = await this.filterByProfessionalCriteria(
        fakeCandidates,
        dto.professionalCriteria,
      )
      const matchMap = new Map(filtered.map((c) => [c.id, (c as any).matchReason ?? null]))

      finalResults = enriched.map((e) => ({
        id: e.id,
        enriched: e.enriched,
        employer: e.employer,
        jobTitle: e.jobTitle,
        industry: e.industry,
        linkedinProfileUrl: e.linkedinProfileUrl,
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
}
