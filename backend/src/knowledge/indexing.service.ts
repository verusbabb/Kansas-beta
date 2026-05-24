import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { Sequelize } from 'sequelize-typescript'
import { QueryTypes } from 'sequelize'
import { PinoLogger } from 'nestjs-pino'
import { GoogleGenAI } from '@google/genai'
import { EmbeddingService } from './embedding.service'
import { VectorStoreService } from './vector-store.service'
import { StorageService } from '../storage/storage.service'
import { Person } from '../database/entities/person.entity'
import { ExecAssignment } from '../database/entities/exec-assignment.entity'
import { ExecTerm } from '../database/entities/exec-term.entity'
import { ExecPosition } from '../database/entities/exec-position.entity'
import { CalendarEvent } from '../database/entities/calendar-event.entity'
import { RushEvent } from '../database/entities/rush-event.entity'
import { RushPageWidget } from '../database/entities/rush-page-widget.entity'
import { HouseMom } from '../database/entities/house-mom.entity'
import { HistoryImage } from '../database/entities/history-image.entity'
import { Newsletter } from '../database/entities/newsletter.entity'

/** Strip HTML tags from a string for clean indexing. */
function stripHtml(html: string | null | undefined): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Format a date as "Month D, YYYY" for readability in indexed content. */
function formatDate(d: Date | string | null | undefined): string {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return String(d)
  }
}

export interface IndexingStatus {
  state: 'idle' | 'running' | 'done' | 'error'
  startedAt: string | null
  completedAt: string | null
  indexed: number
  errors: number
}

@Injectable()
export class IndexingService {
  private genAI: GoogleGenAI | null = null

  private status: IndexingStatus = {
    state: 'idle',
    startedAt: null,
    completedAt: null,
    indexed: 0,
    errors: 0,
  }

  getStatus(): IndexingStatus {
    return { ...this.status }
  }

  constructor(
    @InjectModel(Person) private readonly personModel: typeof Person,
    @InjectModel(ExecAssignment) private readonly assignmentModel: typeof ExecAssignment,
    @InjectModel(ExecTerm) private readonly termModel: typeof ExecTerm,
    @InjectModel(ExecPosition) private readonly positionModel: typeof ExecPosition,
    @InjectModel(CalendarEvent) private readonly calendarEventModel: typeof CalendarEvent,
    @InjectModel(RushEvent) private readonly rushEventModel: typeof RushEvent,
    @InjectModel(RushPageWidget) private readonly rushWidgetModel: typeof RushPageWidget,
    @InjectModel(HouseMom) private readonly houseMomModel: typeof HouseMom,
    @InjectModel(HistoryImage) private readonly historyImageModel: typeof HistoryImage,
    @InjectModel(Newsletter) private readonly newsletterModel: typeof Newsletter,
    private readonly sequelize: Sequelize,
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStore: VectorStoreService,
    private readonly storageService: StorageService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(IndexingService.name)
    const apiKey = process.env.GEMINI_API_KEY
    if (apiKey) {
      this.genAI = new GoogleGenAI({ apiKey })
    }
  }

  /**
   * Full re-index of all site content.
   * Safe to call repeatedly — each source is deleted then re-inserted.
   */
  async reindexAll(): Promise<{ indexed: number; errors: number }> {
    this.status = {
      state: 'running',
      startedAt: new Date().toISOString(),
      completedAt: null,
      indexed: 0,
      errors: 0,
    }

    let indexed = 0
    let errors = 0

    const tasks: Array<() => Promise<number>> = [
      () => this.indexPeople(),
      () => this.indexExecTeam(),
      () => this.indexCalendarEvents(),
      () => this.indexRushEvents(),
      () => this.indexRushWidgets(),
      () => this.indexHouseMom(),
      () => this.indexHistoryImages(),
      () => this.indexAllNewsletters(),
      () => this.indexChapterFacts(),
    ]

    for (const task of tasks) {
      try {
        indexed += await task()
        this.status.indexed = indexed
      } catch (err: any) {
        this.logger.error('IndexingService: task failed', { message: err?.message })
        errors++
        this.status.errors = errors
      }
    }

    this.status = {
      state: errors > 0 && indexed === 0 ? 'error' : 'done',
      startedAt: this.status.startedAt,
      completedAt: new Date().toISOString(),
      indexed,
      errors,
    }

    this.logger.info('IndexingService: reindexAll complete', { indexed, errors })
    return { indexed, errors }
  }

  // ---------------------------------------------------------------------------
  // Per-source indexers
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Relationship + exec enrichment helpers
  // ---------------------------------------------------------------------------

  /**
   * Fetch all person relationships in one query, keyed by person ID.
   * Returns two maps: outgoing (fromPersonId → rows) and incoming (toPersonId → rows).
   */
  private async fetchAllRelationships(): Promise<{
    outgoing: Map<string, Array<{ type: string | null; toName: string; toYear: number | null }>>
    incoming: Map<string, Array<{ type: string | null; fromName: string; fromYear: number | null }>>
  }> {
    type RelRow = {
      from_person_id: string
      to_person_id: string
      relationship_type: string | null
      from_name: string
      from_year: number | null
      to_name: string
      to_year: number | null
    }
    const rows = await this.sequelize.query<RelRow>(
      `SELECT
         pr."fromPersonId" AS from_person_id,
         pr."toPersonId" AS to_person_id,
         pr."relationshipType" AS relationship_type,
         pf."firstName" || ' ' || pf."lastName" AS from_name,
         pf."pledgeClassYear" AS from_year,
         pt."firstName" || ' ' || pt."lastName" AS to_name,
         pt."pledgeClassYear" AS to_year
       FROM person_relationships pr
       JOIN people pf ON pf.id = pr."fromPersonId" AND pf."deletedAt" IS NULL
       JOIN people pt ON pt.id = pr."toPersonId" AND pt."deletedAt" IS NULL
       WHERE pr."deletedAt" IS NULL`,
      { type: QueryTypes.SELECT },
    )

    const outgoing = new Map<string, Array<{ type: string | null; toName: string; toYear: number | null }>>()
    const incoming = new Map<string, Array<{ type: string | null; fromName: string; fromYear: number | null }>>()

    for (const r of rows) {
      const out = outgoing.get(r.from_person_id) ?? []
      out.push({ type: r.relationship_type, toName: r.to_name, toYear: r.to_year })
      outgoing.set(r.from_person_id, out)

      const inc = incoming.get(r.to_person_id) ?? []
      inc.push({ type: r.relationship_type, fromName: r.from_name, fromYear: r.from_year })
      incoming.set(r.to_person_id, inc)
    }

    return { outgoing, incoming }
  }

  /**
   * Fetch all exec assignments in one query, keyed by personId.
   */
  private async fetchAllExecAssignments(): Promise<
    Map<string, Array<{ position: string; term: string }>>
  > {
    type AssignRow = {
      person_id: string
      position: string
      term: string
    }
    const rows = await this.sequelize.query<AssignRow>(
      `SELECT
         ea."personId" AS person_id,
         ep."displayName" AS position,
         COALESCE(et.label, INITCAP(et.season::text) || ' ' || et.year::text) AS term
       FROM exec_assignments ea
       JOIN exec_positions ep ON ep.id = ea."execPositionId"
       JOIN exec_terms et ON et.id = ea."execTermId"
       WHERE ea."personId" IS NOT NULL
       ORDER BY et.year DESC, (CASE WHEN et.season = 'fall' THEN 1 ELSE 0 END) DESC`,
      { type: QueryTypes.SELECT },
    )

    const map = new Map<string, Array<{ position: string; term: string }>>()
    for (const r of rows) {
      const list = map.get(r.person_id) ?? []
      list.push({ position: r.position, term: r.term })
      map.set(r.person_id, list)
    }
    return map
  }

  /**
   * Build enriched chunk text for a single person given their relationship
   * and exec assignment lookup data.
   */
  private buildPersonChunk(
    p: Person,
    outgoing: Map<string, Array<{ type: string | null; toName: string; toYear: number | null }>>,
    incoming: Map<string, Array<{ type: string | null; fromName: string; fromYear: number | null }>>,
    execMap: Map<string, Array<{ position: string; term: string }>>,
  ): string {
    const parts: string[] = [
      `Member: ${p.firstName} ${p.lastName}`,
      p.pledgeClassYear ? `Pledge class of ${p.pledgeClassYear}` : null,
      p.city && p.state
        ? `Lives in ${p.city}, ${p.state}`
        : p.state
          ? `Lives in ${p.state}`
          : null,
    ].filter(Boolean) as string[]

    // Parent: outgoing 'parent' relationships (fromPerson = this person, toPerson = parent)
    const parents = (outgoing.get(p.id) ?? [])
      .filter((r) => r.type === 'parent')
      .map((r) => `${r.toName}${r.toYear ? ` (class of ${r.toYear})` : ''}`)
    if (parents.length) {
      parts.push(`Parent: ${parents.join(', ')}`)
    }

    // Big brother: outgoing 'brother' relationships
    const bigs = (outgoing.get(p.id) ?? [])
      .filter((r) => r.type === 'brother')
      .map((r) => `${r.toName}${r.toYear ? ` (class of ${r.toYear})` : ''}`)
    if (bigs.length) {
      parts.push(`Big brother: ${bigs.join(', ')}`)
    }

    // Children / littles: people who list this person as their parent (incoming 'parent')
    const children = (incoming.get(p.id) ?? [])
      .filter((r) => r.type === 'parent')
      .map((r) => `${r.fromName}${r.fromYear ? ` (class of ${r.fromYear})` : ''}`)
    if (children.length) {
      parts.push(`Children: ${children.join(', ')}`)
    }

    // Offices held from exec_assignments
    const offices = (execMap.get(p.id) ?? []).map((a) => `${a.position} (${a.term})`)
    if (offices.length) {
      parts.push(`Offices held: ${offices.join(', ')}`)
    }

    return parts.join('. ') + '.'
  }

  async indexPeople(): Promise<number> {
    const people = await this.personModel.findAll({ where: { isMember: true } })

    const [{ outgoing, incoming }, execMap] = await Promise.all([
      this.fetchAllRelationships(),
      this.fetchAllExecAssignments(),
    ])

    const items = people.map((p) => ({
      person: p,
      content: this.buildPersonChunk(p, outgoing, incoming, execMap),
    }))

    // Batch embed all members 10 at a time — ~10x faster than sequential
    const embeddings = await this.embeddingService.embedBatch(items.map((i) => i.content))

    let count = 0
    for (let i = 0; i < items.length; i++) {
      const { person: p, content } = items[i]
      const embedding = embeddings[i]
      if (!embedding) continue
      try {
        await this.vectorStore.upsertForSource('person', p.id, [
          {
            content,
            metadata: { firstName: p.firstName, lastName: p.lastName, pledgeClassYear: p.pledgeClassYear },
            embedding,
          },
        ])
        count++
      } catch (err: any) {
        this.logger.warn('IndexingService: failed to index person', { id: p.id, message: err?.message })
      }
    }

    this.logger.info('IndexingService: indexed people', { count })
    return count
  }

  async indexExecTeam(): Promise<number> {
    const assignments = await this.assignmentModel.findAll({
      include: [
        { model: ExecTerm, required: true },
        { model: ExecPosition, required: true },
        { model: Person, required: false, attributes: ['id', 'firstName', 'lastName'] },
      ],
    })

    const byTerm = new Map<string, typeof assignments>()
    for (const a of assignments) {
      const list = byTerm.get(a.execTermId) ?? []
      list.push(a)
      byTerm.set(a.execTermId, list)
    }

    const items: Array<{ termId: string; content: string; meta: Record<string, any> }> = []
    for (const [termId, termAssignments] of byTerm.entries()) {
      const term = termAssignments[0].execTerm
      if (!term) continue
      const termLabel = term.label ?? `${term.season} ${term.year}`
      const roster = termAssignments
        .map((a) => {
          const name = a.person ? `${a.person.firstName} ${a.person.lastName}` : 'Vacant'
          return `${a.execPosition?.displayName ?? 'Unknown'}: ${name}`
        })
        .join(', ')
      items.push({
        termId,
        content: `Exec team for ${termLabel}${term.isCurrent ? ' (current)' : ''}: ${roster}.`,
        meta: { termId, termLabel, isCurrent: term.isCurrent, season: term.season, year: term.year },
      })
    }

    const embeddings = await this.embeddingService.embedBatch(items.map((i) => i.content))
    let count = 0
    for (let i = 0; i < items.length; i++) {
      const embedding = embeddings[i]
      if (!embedding) continue
      try {
        await this.vectorStore.upsertForSource('exec_team', items[i].termId, [
          { content: items[i].content, metadata: items[i].meta, embedding },
        ])
        count++
      } catch (err: any) {
        this.logger.warn('IndexingService: failed to index exec term', { termId: items[i].termId, message: err?.message })
      }
    }

    this.logger.info('IndexingService: indexed exec terms', { count })
    return count
  }

  async indexCalendarEvents(): Promise<number> {
    const events = await this.calendarEventModel.findAll()

    const items = events.map((e) => {
      const parts = [
        `Chapter event: ${e.name}`,
        `Date: ${formatDate(e.startDate)}${e.startDate !== e.endDate ? ` to ${formatDate(e.endDate)}` : ''}`,
        e.startTime ? `Time: ${e.startTime}` : null,
        e.description ? `Details: ${stripHtml(e.description)}` : null,
      ].filter(Boolean) as string[]
      return { event: e, content: parts.join('. ') + '.' }
    })

    const embeddings = await this.embeddingService.embedBatch(items.map((i) => i.content))
    let count = 0
    for (let i = 0; i < items.length; i++) {
      const embedding = embeddings[i]
      if (!embedding) continue
      const e = items[i].event
      try {
        await this.vectorStore.upsertForSource('calendar_event', e.id, [
          { content: items[i].content, metadata: { name: e.name, startDate: e.startDate, endDate: e.endDate }, embedding },
        ])
        count++
      } catch (err: any) {
        this.logger.warn('IndexingService: failed to index calendar event', { id: e.id, message: err?.message })
      }
    }

    this.logger.info('IndexingService: indexed calendar events', { count })
    return count
  }

  async indexRushEvents(): Promise<number> {
    const events = await this.rushEventModel.findAll()

    const items = events.map((e) => {
      const parts = [
        `Rush event: ${e.title}`,
        `Date: ${e.displayDate}`,
        e.location ? `Location: ${e.location}` : null,
        e.timeLabel ? `Time: ${e.timeLabel}` : null,
        e.description ? `Details: ${stripHtml(e.description)}` : null,
      ].filter(Boolean) as string[]
      return { event: e, content: parts.join('. ') + '.' }
    })

    const embeddings = await this.embeddingService.embedBatch(items.map((i) => i.content))
    let count = 0
    for (let i = 0; i < items.length; i++) {
      const embedding = embeddings[i]
      if (!embedding) continue
      const e = items[i].event
      try {
        await this.vectorStore.upsertForSource('rush_event', e.id, [
          { content: items[i].content, metadata: { title: e.title, displayDate: e.displayDate, location: e.location }, embedding },
        ])
        count++
      } catch (err: any) {
        this.logger.warn('IndexingService: failed to index rush event', { id: e.id, message: err?.message })
      }
    }

    this.logger.info('IndexingService: indexed rush events', { count })
    return count
  }

  async indexRushWidgets(): Promise<number> {
    const widgets = await this.rushWidgetModel.findAll()

    const items = widgets.map((w) => {
      const body = stripHtml(w.bodyHtml)
      return { widget: w, content: `Rush info — ${w.title}${body ? ': ' + body : ''}.` }
    })

    const embeddings = await this.embeddingService.embedBatch(items.map((i) => i.content))
    let count = 0
    for (let i = 0; i < items.length; i++) {
      const embedding = embeddings[i]
      if (!embedding) continue
      const w = items[i].widget
      try {
        await this.vectorStore.upsertForSource('rush_widget', w.id, [
          { content: items[i].content, metadata: { title: w.title, slotIndex: w.slotIndex }, embedding },
        ])
        count++
      } catch (err: any) {
        this.logger.warn('IndexingService: failed to index rush widget', { id: w.id, message: err?.message })
      }
    }

    this.logger.info('IndexingService: indexed rush widgets', { count })
    return count
  }

  async indexHouseMom(): Promise<number> {
    const [mom] = await this.houseMomModel.findAll({ limit: 1 })
    if (!mom) return 0

    const bio = stripHtml(mom.bioHtml)
    const content = `House Mom: ${mom.firstName} ${mom.lastName}${bio ? '. ' + bio : ''}.`
    try {
      const embedding = await this.embeddingService.embed(content)
      await this.vectorStore.upsertForSource('house_mom', mom.id, [
        { content, metadata: { firstName: mom.firstName, lastName: mom.lastName }, embedding },
      ])
      this.logger.info('IndexingService: indexed house mom')
      return 1
    } catch (err: any) {
      this.logger.warn('IndexingService: failed to index house mom', { message: err?.message })
      return 0
    }
  }

  async indexHistoryImages(): Promise<number> {
    const images = await this.historyImageModel.findAll()

    const items = images
      .filter((img) => !!img.caption)
      .map((img) => ({
        image: img,
        content: `Chapter history photo: ${img.caption}${img.altText ? ' — ' + img.altText : ''}.`,
      }))

    const embeddings = await this.embeddingService.embedBatch(items.map((i) => i.content))
    let count = 0
    for (let i = 0; i < items.length; i++) {
      const embedding = embeddings[i]
      if (!embedding) continue
      const img = items[i].image
      try {
        await this.vectorStore.upsertForSource('history_image', img.id, [
          { content: items[i].content, metadata: { caption: img.caption, altText: img.altText }, embedding },
        ])
        count++
      } catch (err: any) {
        this.logger.warn('IndexingService: failed to index history image', { id: img.id, message: err?.message })
      }
    }

    this.logger.info('IndexingService: indexed history images', { count })
    return count
  }

  /**
   * Index all newsletters. Processes 3 PDFs concurrently for throughput.
   * Falls back to metadata-only stub on individual failures.
   */
  async indexAllNewsletters(): Promise<number> {
    const newsletters = await this.newsletterModel.findAll()
    let count = 0
    const CONCURRENCY = 3

    for (let i = 0; i < newsletters.length; i += CONCURRENCY) {
      const batch = newsletters.slice(i, i + CONCURRENCY)
      const results = await Promise.allSettled(batch.map((n) => this.indexNewsletter(n)))

      for (let j = 0; j < results.length; j++) {
        const result = results[j]
        const n = batch[j]
        if (result.status === 'fulfilled') {
          count += result.value
        } else {
          this.logger.warn('IndexingService: failed to index newsletter', {
            id: n.id,
            season: n.season,
            year: n.year,
            message: (result.reason as any)?.message,
          })
          // Fall back to metadata stub
          try {
            const content = `Newsletter: ${n.season} ${n.year} edition.`
            const embedding = await this.embeddingService.embed(content)
            await this.vectorStore.upsertForSource('newsletter', `${n.id}_meta`, [
              { content, metadata: { newsletterId: n.id, season: n.season, year: n.year }, embedding },
            ])
            count++
          } catch {
            // Silently skip if embedding also fails
          }
        }
      }
    }

    this.logger.info('IndexingService: indexed newsletters', { count })
    return count
  }

  /**
   * Extract and index a single newsletter PDF.
   *
   * Flow:
   *  1. Download PDF buffer from GCS via StorageService
   *  2. Upload to Gemini Files API → get a fileUri
   *  3. Ask Gemini to extract articles as structured JSON
   *  4. Embed each article chunk and upsert into knowledge_chunks
   *
   * Returns the number of chunks indexed.
   */
  async indexNewsletter(newsletter: Newsletter): Promise<number> {
    if (!this.genAI || !newsletter.filePath) {
      return 0
    }

    // Step 1: Download PDF from GCS
    const pdfBuffer = await this.storageService.downloadFile(newsletter.filePath)
    if (!pdfBuffer || !pdfBuffer.length) {
      this.logger.warn('IndexingService: newsletter PDF not found in GCS', {
        filePath: newsletter.filePath,
      })
      return 0
    }

    // Step 2: Upload to Gemini Files API for multimodal processing
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' })
    const uploadedFile = await this.genAI.files.upload({
      file: blob,
      config: {
        mimeType: 'application/pdf',
        displayName: `newsletter-${newsletter.season}-${newsletter.year}.pdf`,
      },
    })

    if (!uploadedFile.uri) {
      throw new Error('Gemini Files API returned no URI')
    }

    // Step 3: Ask Gemini to extract articles from the PDF
    const extractionPrompt = `This is a fraternity chapter newsletter PDF.
Extract every distinct article or section from the newsletter.
For each article return a JSON object with these fields:
- title: article title or section heading (string)
- author: author name if present, otherwise null
- content: full text content of the article (string, preserve meaning but remove formatting artifacts)

Return ONLY a valid JSON array: [{ "title": "...", "author": "...", "content": "..." }, ...]
Do not include boilerplate, page numbers, headers, or footers as separate articles.`

    const result = await this.genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { fileData: { fileUri: uploadedFile.uri, mimeType: 'application/pdf' } },
            { text: extractionPrompt },
          ],
        },
      ],
      config: { responseMimeType: 'application/json', temperature: 0 },
    })

    let articles: Array<{ title: string; author: string | null; content: string }> = []
    try {
      articles = JSON.parse(result.text ?? '[]')
    } catch {
      this.logger.warn('IndexingService: failed to parse Gemini article extraction', {
        newsletterId: newsletter.id,
      })
      return 0
    }

    if (!articles.length) return 0

    // Step 4: Embed all article chunks concurrently then upsert
    const chunkTexts = articles.map((article) =>
      [
        `Newsletter (${newsletter.season} ${newsletter.year})`,
        article.title ? `Article: ${article.title}` : null,
        article.author ? `By: ${article.author}` : null,
        article.content,
      ]
        .filter(Boolean)
        .join('\n'),
    )

    const embeddings = await this.embeddingService.embedBatch(chunkTexts)

    const chunks: Array<{ content: string; metadata: Record<string, any>; embedding: number[] }> = []
    for (let i = 0; i < articles.length; i++) {
      const embedding = embeddings[i]
      if (!embedding) continue
      chunks.push({
        content: chunkTexts[i],
        metadata: {
          newsletterId: newsletter.id,
          season: newsletter.season,
          year: newsletter.year,
          articleTitle: articles[i].title,
          author: articles[i].author,
        },
        embedding,
      })
    }

    await this.vectorStore.upsertForSource('newsletter', newsletter.id, chunks)

    this.logger.info('IndexingService: newsletter articles indexed', {
      newsletterId: newsletter.id,
      season: newsletter.season,
      year: newsletter.year,
      articleCount: chunks.length,
    })

    // Clean up the temporary Gemini file
    try {
      if (uploadedFile.name) {
        await this.genAI.files.delete({ name: uploadedFile.name })
      }
    } catch {
      // Non-fatal; files auto-expire after 48h anyway
    }

    return chunks.length
  }

  /**
   * Index hardcoded chapter facts that never change.
   * Covers: chapter name, university, national affiliation, founding year,
   * address, and mission.  Source type: 'chapter_fact'.
   */
  async indexChapterFacts(): Promise<number> {
    const facts = [
      `Kansas Beta chapter of Beta Theta Pi fraternity at the University of Kansas. ` +
        `Chapter name: Kansas Beta. University: University of Kansas (KU), Lawrence, Kansas. ` +
        `National affiliation: Beta Theta Pi. ` +
        `Chapter address: 1425 Tennessee St, Lawrence, KS 66044. ` +
        `Mission: To develop men of principle for a principled life.`,

      `Beta Theta Pi fraternity — Kansas Beta chapter history and founding. ` +
        `Founded at the University of Kansas. ` +
        `Beta Theta Pi is a North American collegiate fraternity founded in 1839 at Miami University. ` +
        `The Kansas Beta chapter is one of Beta Theta Pi's oldest continuously active chapters. ` +
        `Values: Courage, Integrity, and Truth.`,

      `Kansas Beta chapter facts: ` +
        `Full chapter name: Kansas Beta of Beta Theta Pi. ` +
        `University: University of Kansas. ` +
        `City: Lawrence, Kansas. ` +
        `Greek letters: Beta Theta Pi (ΒΘΠ). ` +
        `Chapter house address: 1425 Tennessee St, Lawrence, KS 66044. ` +
        `National organization: Beta Theta Pi Fraternity, headquartered in Oxford, Ohio.`,
    ]

    const embeddings = await this.embeddingService.embedBatch(facts)
    const chunks: Array<{ content: string; metadata: Record<string, any>; embedding: number[] }> = []

    for (let i = 0; i < facts.length; i++) {
      const embedding = embeddings[i]
      if (!embedding) continue
      chunks.push({ content: facts[i], metadata: { factIndex: i }, embedding })
    }

    try {
      await this.vectorStore.upsertForSource('chapter_fact', 'global', chunks)
      this.logger.info('IndexingService: indexed chapter facts', { count: chunks.length })
    } catch (err: any) {
      this.logger.warn('IndexingService: failed to index chapter facts', { message: err?.message })
      return 0
    }

    return chunks.length
  }

  // ---------------------------------------------------------------------------
  // Incremental single-record indexers (fire-and-forget from mutation hooks)
  // ---------------------------------------------------------------------------

  async indexOnePerson(person: Person): Promise<void> {
    if (!person.isMember) return

    type RelRow = {
      from_person_id: string
      to_person_id: string
      relationship_type: string | null
      from_name: string
      from_year: number | null
      to_name: string
      to_year: number | null
    }
    type AssignRow = { person_id: string; position: string; term: string }

    const [relRows, assignRows] = await Promise.all([
      this.sequelize.query<RelRow>(
        `SELECT
           pr."fromPersonId" AS from_person_id,
           pr."toPersonId" AS to_person_id,
           pr."relationshipType" AS relationship_type,
           pf."firstName" || ' ' || pf."lastName" AS from_name,
           pf."pledgeClassYear" AS from_year,
           pt."firstName" || ' ' || pt."lastName" AS to_name,
           pt."pledgeClassYear" AS to_year
         FROM person_relationships pr
         JOIN people pf ON pf.id = pr."fromPersonId" AND pf."deletedAt" IS NULL
         JOIN people pt ON pt.id = pr."toPersonId" AND pt."deletedAt" IS NULL
         WHERE pr."deletedAt" IS NULL
           AND (pr."fromPersonId" = :personId OR pr."toPersonId" = :personId)`,
        { replacements: { personId: person.id }, type: QueryTypes.SELECT },
      ),
      this.sequelize.query<AssignRow>(
        `SELECT
           ea."personId" AS person_id,
           ep."displayName" AS position,
           COALESCE(et.label, INITCAP(et.season::text) || ' ' || et.year::text) AS term
         FROM exec_assignments ea
         JOIN exec_positions ep ON ep.id = ea."execPositionId"
         JOIN exec_terms et ON et.id = ea."execTermId"
         WHERE ea."personId" = :personId
         ORDER BY et.year DESC, (CASE WHEN et.season = 'fall' THEN 1 ELSE 0 END) DESC`,
        { replacements: { personId: person.id }, type: QueryTypes.SELECT },
      ),
    ])

    // Build lookup maps scoped to this person
    const outgoing = new Map([
      [person.id, relRows.filter((r) => r.from_person_id === person.id).map((r) => ({ type: r.relationship_type, toName: r.to_name, toYear: r.to_year }))],
    ])
    const incoming = new Map([
      [person.id, relRows.filter((r) => r.to_person_id === person.id).map((r) => ({ type: r.relationship_type, fromName: r.from_name, fromYear: r.from_year }))],
    ])
    const execMap = new Map([
      [person.id, assignRows.map((r) => ({ position: r.position, term: r.term }))],
    ])

    const content = this.buildPersonChunk(person, outgoing, incoming, execMap)

    try {
      const embedding = await this.embeddingService.embed(content)
      await this.vectorStore.upsertForSource('person', person.id, [
        {
          content,
          metadata: {
            firstName: person.firstName,
            lastName: person.lastName,
            pledgeClassYear: person.pledgeClassYear,
          },
          embedding,
        },
      ])
      this.logger.info('IndexingService: indexed one person', { id: person.id })
    } catch (err: any) {
      this.logger.warn('IndexingService: failed to index one person', {
        id: person.id,
        message: err?.message,
      })
    }
  }

  async indexOneCalendarEvent(event: CalendarEvent): Promise<void> {
    const parts = [
      `Chapter event: ${event.name}`,
      `Date: ${formatDate(event.startDate)}${event.startDate !== event.endDate ? ` to ${formatDate(event.endDate)}` : ''}`,
      event.startTime ? `Time: ${event.startTime}` : null,
      event.description ? `Details: ${stripHtml(event.description)}` : null,
    ].filter(Boolean) as string[]
    const content = parts.join('. ') + '.'
    try {
      const embedding = await this.embeddingService.embed(content)
      await this.vectorStore.upsertForSource('calendar_event', event.id, [
        {
          content,
          metadata: { name: event.name, startDate: event.startDate, endDate: event.endDate },
          embedding,
        },
      ])
      this.logger.info('IndexingService: indexed one calendar event', { id: event.id })
    } catch (err: any) {
      this.logger.warn('IndexingService: failed to index one calendar event', {
        id: event.id,
        message: err?.message,
      })
    }
  }

  async deletePersonIndex(personId: string): Promise<void> {
    try {
      await this.vectorStore.deleteBySource('person', personId)
      this.logger.info('IndexingService: deleted person index', { personId })
    } catch (err: any) {
      this.logger.warn('IndexingService: failed to delete person index', {
        personId,
        message: err?.message,
      })
    }
  }

  async deleteCalendarEventIndex(eventId: string): Promise<void> {
    try {
      await this.vectorStore.deleteBySource('calendar_event', eventId)
      this.logger.info('IndexingService: deleted calendar event index', { eventId })
    } catch (err: any) {
      this.logger.warn('IndexingService: failed to delete calendar event index', {
        eventId,
        message: err?.message,
      })
    }
  }

  /**
   * Index a single record by source type and ID.
   * Used for incremental re-indexing after mutations.
   */
  async reindexOne(sourceType: string, sourceId: string): Promise<void> {
    switch (sourceType) {
      case 'calendar_event': {
        const e = await this.calendarEventModel.findByPk(sourceId)
        if (e) await this.indexCalendarEvents()
        break
      }
      case 'rush_event': {
        await this.indexRushEvents()
        break
      }
      case 'rush_widget': {
        await this.indexRushWidgets()
        break
      }
      case 'exec_team': {
        await this.indexExecTeam()
        break
      }
      default:
        this.logger.warn('IndexingService: unknown sourceType for reindexOne', { sourceType })
    }
  }
}
