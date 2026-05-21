import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { PinoLogger } from 'nestjs-pino'
import { firstValueFrom } from 'rxjs'

export interface PdlProfile {
  employer: string | null
  jobTitle: string | null
  industry: string | null
  headline: string | null
  /** PDL likelihood score 1–10. Higher = more confident match. */
  likelihood: number
}

interface PdlResponse {
  status: number
  likelihood: number
  data: {
    job_title: string | null
    job_company_name: string | null
    industry: string | null
    headline: string | null
  }
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
      // PDL expects the profile path, not the full URL
      const match = params.linkedinUrl.match(/linkedin\.com\/in\/([^/?#]+)/)
      if (match) {
        query.profile = `linkedin.com/in/${match[1]}`
      }
    }

    try {
      const { data } = await firstValueFrom(
        this.http.get<PdlResponse>('https://api.peopledatalabs.com/v5/person/enrich', {
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
        likelihood: data.likelihood,
      }
    } catch (err: any) {
      const status = err?.response?.status
      // 404 = no match found — not an error, just no data
      if (status === 404) return null

      this.logger.warn('PDL: request failed', {
        name: `${params.firstName} ${params.lastName}`,
        status,
        message: err?.message,
      })
      return null
    }
  }
}
