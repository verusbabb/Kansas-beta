import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { Op } from 'sequelize'
import { PinoLogger } from 'nestjs-pino'
import { GoogleGenAI } from '@google/genai'
import { Person } from '../database/entities/person.entity'
import { ExecAssignment } from '../database/entities/exec-assignment.entity'
import { ExecTerm } from '../database/entities/exec-term.entity'
import { ExecPosition } from '../database/entities/exec-position.entity'
import { PersonRelationship } from '../database/entities/person-relationship.entity'
import { Newsletter } from '../database/entities/newsletter.entity'
import { EnrichmentService } from './enrichment/enrichment.service'
import { RetrievalService } from '../knowledge/retrieval.service'
import type { AskQueryDto } from './dto/ask-query.dto'
import type {
  AskResponseDto,
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
  profileHeadshotFilePath: string | null
  shareAddress: boolean
  shareEmail: boolean
  shareLinkedIn: boolean
  officeHistory: OfficeHistoryItemDto[]
  relationships: RelationshipItemDto[]
}

const QUERY_LIMIT = 100

@Injectable()
export class AskService {
  private genAI: GoogleGenAI | null = null

  constructor(
    @InjectModel(Person)
    private readonly personModel: typeof Person,
    @InjectModel(ExecAssignment)
    private readonly execAssignmentModel: typeof ExecAssignment,
    @InjectModel(PersonRelationship)
    private readonly relationshipModel: typeof PersonRelationship,
    @InjectModel(Newsletter)
    private readonly newsletterModel: typeof Newsletter,
    private readonly enrichmentService: EnrichmentService,
    private readonly retrievalService: RetrievalService,
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
      email: p.shareEmailWithLoggedInMembers ? (p.email ?? null) : null,
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

    const positionWhere: Record<string, any> = {}
    if (filters.execPosition) {
      positionWhere.displayName = { [Op.iLike]: `%${filters.execPosition}%` }
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
          attributes: ['id', 'firstName', 'lastName', 'pledgeClassYear'],
        },
        {
          model: Person,
          as: 'toPerson',
          attributes: ['id', 'firstName', 'lastName', 'pledgeClassYear'],
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
