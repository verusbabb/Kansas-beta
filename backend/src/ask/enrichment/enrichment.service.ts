import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { PinoLogger } from 'nestjs-pino'
import { Op } from 'sequelize'
import { Person } from '../../database/entities/person.entity'
import {
  PersonEnrichment,
  EnrichmentSource,
  EnrichmentConfidence,
} from '../../database/entities/person-enrichment.entity'
import { PdlService } from './pdl.service'
import { FullContactService } from './fullcontact.service'
import { DatagmaService } from './datagma.service'

/** TTL for a successful enrichment result (90 days). */
const ENRICHMENT_TTL_DAYS = 90
/** TTL for a failed/empty enrichment (7 days — retry sooner). */
const EMPTY_TTL_DAYS = 7

export interface EnrichmentResult {
  enriched: boolean
  source: EnrichmentSource
  employer: string | null
  jobTitle: string | null
  industry: string | null
  headline: string | null
  linkedinUrl: string | null
  confidence: EnrichmentConfidence | null
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
  constructor(
    @InjectModel(PersonEnrichment)
    private readonly enrichmentModel: typeof PersonEnrichment,
    @InjectModel(Person)
    private readonly personModel: typeof Person,
    private readonly pdl: PdlService,
    private readonly fullContact: FullContactService,
    private readonly datagma: DatagmaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(EnrichmentService.name)
  }

  /**
   * Enrich a single person.
   *
   * Waterfall (stops at first match):
   *   1. DB cache (person_enrichments) — return immediately if fresh
   *   2. PDL by LinkedIn URL              — 85%+ match when URL is known
   *   3. FullContact by personal email    — best personal-email identity resolution
   *   4. Datagma by personal email        — ~41% Gmail hit rate
   *   5. PDL name+location search         — discover LinkedIn URL, then enrich
   *
   * On every cache miss the result (including empty) is persisted with a TTL.
   * Discovered LinkedIn URLs are written back to people.linkedin_profile_url.
   */
  async enrichOne(person: PersonForEnrichment): Promise<EnrichmentResult> {
    const empty: EnrichmentResult = {
      enriched: false,
      source: 'none',
      employer: null,
      jobTitle: null,
      industry: null,
      headline: null,
      linkedinUrl: null,
      confidence: null,
    }

    // ── Tier 0: DB cache ────────────────────────────────────────────────────
    const cached = await this.enrichmentModel.findOne({
      where: {
        personId: person.id,
        expiresAt: { [Op.gt]: new Date() },
      },
    })

    if (cached) {
      this.logger.info('Enrichment: cache hit', { personId: person.id })
      return {
        enriched: cached.source !== 'none',
        source: cached.source,
        employer: cached.employer ?? null,
        jobTitle: cached.jobTitle ?? null,
        industry: cached.industry ?? null,
        headline: cached.headline ?? null,
        linkedinUrl: cached.linkedinUrlDiscovered ?? person.linkedinProfileUrl,
        confidence: cached.confidence ?? null,
      }
    }

    const name = `${person.firstName} ${person.lastName}`
    this.logger.info('Enrichment: starting waterfall', {
      personId: person.id,
      name,
      hasLinkedin: !!person.linkedinProfileUrl,
      hasEmail: !!person.email,
      hasCity: !!person.city,
      pdlConfigured: this.pdl.isConfigured,
      datagmaConfigured: this.datagma.isConfigured,
      fullContactConfigured: this.fullContact.isConfigured,
    })

    // ── Tier 1: PDL by stored LinkedIn URL ──────────────────────────────────
    if (person.linkedinProfileUrl && this.pdl.isConfigured) {
      this.logger.info('Enrichment: trying Tier 1 — PDL by LinkedIn URL', { name })
      const pdlResult = await this.pdl.enrichPerson({
        firstName: person.firstName,
        lastName: person.lastName,
        linkedinUrl: person.linkedinProfileUrl,
      })

      if (pdlResult) {
        const result: EnrichmentResult = {
          enriched: true,
          source: 'pdl',
          employer: pdlResult.employer,
          jobTitle: pdlResult.jobTitle,
          industry: pdlResult.industry,
          headline: pdlResult.headline,
          linkedinUrl: pdlResult.linkedinUrl ?? person.linkedinProfileUrl,
          confidence: pdlResult.likelihood >= 8 ? 'high' : 'medium',
        }
        await this.saveCache(person.id, result, ENRICHMENT_TTL_DAYS)
        return result
      }
    }

    // ── Tier 2: FullContact by personal email ───────────────────────────────
    if (person.email && this.fullContact.isConfigured) {
      this.logger.info('Enrichment: trying Tier 2 — FullContact by email', { name })
      const fcResult = await this.fullContact.enrichByEmail(person.email)

      if (fcResult) {
        // Write discovered LinkedIn URL back to the people table
        if (fcResult.linkedinUrl && !person.linkedinProfileUrl) {
          await this.writeLinkedinUrl(person.id, fcResult.linkedinUrl)
        }

        const result: EnrichmentResult = {
          enriched: true,
          source: 'fullcontact',
          employer: fcResult.employer,
          jobTitle: fcResult.jobTitle,
          industry: null,
          headline: null,
          linkedinUrl: fcResult.linkedinUrl ?? person.linkedinProfileUrl,
          confidence: fcResult.confidence,
        }
        await this.saveCache(person.id, result, ENRICHMENT_TTL_DAYS)
        return result
      }
    }

    // ── Tier 2b: PDL by personal email ──────────────────────────────────────
    if (person.email && this.pdl.isConfigured) {
      this.logger.info('Enrichment: trying Tier 2b — PDL by personal email', { name })
      const pdlResult = await this.pdl.enrichPerson({
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        city: person.city,
        state: person.state,
      })

      if (pdlResult) {
        if (pdlResult.linkedinUrl && !person.linkedinProfileUrl) {
          await this.writeLinkedinUrl(person.id, pdlResult.linkedinUrl)
        }
        const result: EnrichmentResult = {
          enriched: true,
          source: 'pdl',
          employer: pdlResult.employer,
          jobTitle: pdlResult.jobTitle,
          industry: pdlResult.industry,
          headline: pdlResult.headline,
          linkedinUrl: pdlResult.linkedinUrl ?? person.linkedinProfileUrl,
          confidence: pdlResult.likelihood >= 8 ? 'high' : 'medium',
        }
        await this.saveCache(person.id, result, ENRICHMENT_TTL_DAYS)
        return result
      }
    }

    // ── Tier 3: Datagma by personal email ───────────────────────────────────
    if (person.email && this.datagma.isConfigured) {
      this.logger.info('Enrichment: trying Tier 3 — Datagma by email', {
        name,
        email: person.email,
      })
      const dgResult = await this.datagma.enrichByEmail(person.email)

      if (dgResult) {
        if (dgResult.linkedinUrl && !person.linkedinProfileUrl) {
          await this.writeLinkedinUrl(person.id, dgResult.linkedinUrl)
        }

        const result: EnrichmentResult = {
          enriched: true,
          source: 'datagma',
          employer: dgResult.employer,
          jobTitle: dgResult.jobTitle,
          industry: dgResult.industry,
          headline: null,
          linkedinUrl: dgResult.linkedinUrl ?? person.linkedinProfileUrl,
          confidence: 'medium',
        }
        await this.saveCache(person.id, result, ENRICHMENT_TTL_DAYS)
        return result
      }
    }

    // ── Tier 4: PDL name+location search → discover LinkedIn URL ────────────
    if (this.pdl.isConfigured) {
      this.logger.info('Enrichment: trying Tier 4 — PDL name/location search', {
        name,
        city: person.city,
        state: person.state,
      })
      const discoveredUrl = await this.pdl.searchByNameLocation(
        person.firstName,
        person.lastName,
        person.city,
        person.state,
      )

      if (discoveredUrl) {
        await this.writeLinkedinUrl(person.id, discoveredUrl)

        const pdlResult = await this.pdl.enrichPerson({
          firstName: person.firstName,
          lastName: person.lastName,
          linkedinUrl: discoveredUrl,
        })

        if (pdlResult) {
          const result: EnrichmentResult = {
            enriched: true,
            source: 'pdl',
            employer: pdlResult.employer,
            jobTitle: pdlResult.jobTitle,
            industry: pdlResult.industry,
            headline: pdlResult.headline,
            linkedinUrl: pdlResult.linkedinUrl ?? discoveredUrl,
            confidence: pdlResult.likelihood >= 8 ? 'high' : 'medium',
          }
          await this.saveCache(person.id, result, ENRICHMENT_TTL_DAYS)
          return result
        }
      }
    }

    // ── All tiers exhausted: cache the empty result with a short TTL ─────────
    this.logger.warn('Enrichment: all tiers exhausted — no data found', {
      name,
      personId: person.id,
    })
    await this.saveCache(person.id, empty, EMPTY_TTL_DAYS)
    return empty
  }

  /**
   * Enrich a batch of people sequentially to respect rate limits.
   */
  async enrichBatch(people: PersonForEnrichment[]): Promise<Map<string, EnrichmentResult>> {
    const results = new Map<string, EnrichmentResult>()

    for (const person of people) {
      results.set(person.id, await this.enrichOne(person))
      // Brief pause between live API calls; cache hits skip straight through
      await new Promise((r) => setTimeout(r, 150))
    }

    return results
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async saveCache(
    personId: string,
    result: EnrichmentResult,
    ttlDays: number,
  ): Promise<void> {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + ttlDays)

    await this.enrichmentModel.upsert({
      personId,
      employer: result.employer,
      jobTitle: result.jobTitle,
      industry: result.industry,
      headline: result.headline,
      linkedinUrlDiscovered: result.linkedinUrl,
      source: result.source,
      confidence: result.confidence,
      enrichedAt: new Date(),
      expiresAt,
    })
  }

  private async writeLinkedinUrl(personId: string, linkedinUrl: string): Promise<void> {
    try {
      await this.personModel.update(
        { linkedinProfileUrl: linkedinUrl },
        { where: { id: personId } },
      )
      this.logger.info('Enrichment: wrote LinkedIn URL back to people', { personId, linkedinUrl })
    } catch (err: any) {
      this.logger.warn('Enrichment: failed to write LinkedIn URL back', {
        personId,
        message: err?.message,
      })
    }
  }
}
