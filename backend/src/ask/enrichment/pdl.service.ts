import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { PinoLogger } from 'nestjs-pino'
import { firstValueFrom } from 'rxjs'

export interface PdlProfile {
  employer: string | null
  jobTitle: string | null
  industry: string | null
  headline: string | null
  linkedinUrl: string | null
  /** PDL likelihood score 1–10. Higher = more confident match. */
  likelihood: number
}

interface PdlPersonData {
  job_title: string | null
  job_company_name: string | null
  industry: string | null
  headline: string | null
  linkedin_url: string | null
}

interface PdlEnrichResponse {
  status: number
  likelihood: number
  data: PdlPersonData
}

interface PdlSearchResult {
  linkedin_url: string | null
  first_name: string | null
  last_name: string | null
}

interface PdlSearchResponse {
  status: number
  total: number
  data: PdlSearchResult[]
}

/** Minimum PDL likelihood score to trust a match (1–10 scale). */
const MIN_LIKELIHOOD = 6

@Injectable()
export class PdlService {
  private readonly apiKey: string | undefined

  constructor(
    private readonly http: HttpService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(PdlService.name)
    this.apiKey = process.env.PDL_API_KEY
  }

  get isConfigured(): boolean {
    return !!this.apiKey
  }

  /**
   * Look up a person's professional profile using all available signals.
   * Returns null if not found, key is missing, or likelihood is too low.
   */
  async enrichPerson(params: {
    firstName: string
    lastName: string
    city?: string | null
    state?: string | null
    email?: string | null
    linkedinUrl?: string | null
  }): Promise<PdlProfile | null> {
    if (!this.apiKey) return null

    const query: Record<string, string> = {
      api_key: this.apiKey,
      first_name: params.firstName,
      last_name: params.lastName,
      pretty: 'false',
    }

    if (params.city && params.state) {
      query.location = `${params.city}, ${params.state}`
    } else if (params.state) {
      query.location = params.state
    }

    if (params.email) {
      query.personal_emails = params.email
    }

    if (params.linkedinUrl) {
      const match = params.linkedinUrl.match(/linkedin\.com\/in\/([^/?#]+)/)
      if (match) {
        query.profile = `linkedin.com/in/${match[1]}`
      }
    }

    try {
      const { data } = await firstValueFrom(
        this.http.get<PdlEnrichResponse>('https://api.peopledatalabs.com/v5/person/enrich', {
          params: query,
          timeout: 10000,
        }),
      )

      if (data.status !== 200 || data.likelihood < MIN_LIKELIHOOD) {
        this.logger.info('PDL: low confidence or no match', {
          name: `${params.firstName} ${params.lastName}`,
          likelihood: data.likelihood,
          status: data.status,
        })
        return null
      }

      this.logger.info('PDL: profile matched', {
        name: `${params.firstName} ${params.lastName}`,
        likelihood: data.likelihood,
        employer: data.data?.job_company_name,
        jobTitle: data.data?.job_title,
      })

      return {
        employer: data.data?.job_company_name ?? null,
        jobTitle: data.data?.job_title ?? null,
        industry: data.data?.industry ?? null,
        headline: data.data?.headline ?? null,
        linkedinUrl: data.data?.linkedin_url ?? null,
        likelihood: data.likelihood,
      }
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 404) return null

      this.logger.warn('PDL: enrichPerson request failed', {
        name: `${params.firstName} ${params.lastName}`,
        status,
        message: err?.message,
      })
      return null
    }
  }

  /**
   * Search PDL by name + location to discover a LinkedIn URL for people
   * who don't have one stored in the DB.
   * Returns the best-matching LinkedIn URL, or null if nothing found.
   */
  async searchByNameLocation(
    firstName: string,
    lastName: string,
    city?: string | null,
    state?: string | null,
  ): Promise<string | null> {
    if (!this.apiKey) return null

    const must: object[] = [
      { term: { first_name: firstName.toLowerCase() } },
      { term: { last_name: lastName.toLowerCase() } },
    ]

    if (city) {
      must.push({ term: { location_locality: city.toLowerCase() } })
    }
    if (state) {
      must.push({ term: { location_region: state.toLowerCase() } })
    }

    const esQuery = { query: { bool: { must } } }

    try {
      const { data } = await firstValueFrom(
        this.http.get<PdlSearchResponse>('https://api.peopledatalabs.com/v5/person/search', {
          params: {
            api_key: this.apiKey,
            query: JSON.stringify(esQuery),
            size: 1,
            pretty: 'false',
          },
          timeout: 10000,
        }),
      )

      if (data.status !== 200 || !data.data?.length) {
        this.logger.info('PDL: name/location search returned no results', {
          name: `${firstName} ${lastName}`,
          total: data.total ?? 0,
          status: data.status,
        })
        return null
      }

      const linkedinUrl = data.data[0]?.linkedin_url ?? null

      this.logger.info('PDL: name/location search result', {
        name: `${firstName} ${lastName}`,
        total: data.total,
        linkedinUrl,
      })

      return linkedinUrl
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 404) return null

      this.logger.warn('PDL: searchByNameLocation failed', {
        name: `${firstName} ${lastName}`,
        status,
        message: err?.message,
      })
      return null
    }
  }
}
