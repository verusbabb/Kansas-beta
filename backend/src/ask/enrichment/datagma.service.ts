import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { PinoLogger } from 'nestjs-pino'
import { firstValueFrom } from 'rxjs'

export interface DatagmaProfile {
  employer: string | null
  jobTitle: string | null
  industry: string | null
  linkedinUrl: string | null
  seniority: string | null
}

interface DatagmaPersonData {
  company?: string | null
  job_title?: string | null
  industry?: string | null
  linkedin_url?: string | null
  seniority?: string | null
  current_company?: {
    name?: string | null
    industry?: string | null
  }
}

interface DatagmaResponse {
  person?: DatagmaPersonData
  error?: string
}

@Injectable()
export class DatagmaService {
  private readonly apiKey: string | undefined

  constructor(
    private readonly http: HttpService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(DatagmaService.name)
    this.apiKey = process.env.DATAGMA_API_KEY
  }

  get isConfigured(): boolean {
    return !!this.apiKey
  }

  /**
   * Enrich a person using their personal email via Datagma's social-graph enrichment.
   * Achieves ~41% match rate on Gmail addresses — roughly double PDL's personal email rate.
   * Returns null on miss or if not configured.
   */
  async enrichByEmail(email: string): Promise<DatagmaProfile | null> {
    if (!this.apiKey || !email) return null

    try {
      const { data } = await firstValueFrom(
        this.http.get<DatagmaResponse>('https://gateway.datagma.net/api/ingress/v2/full', {
          params: {
            uid: this.apiKey,
            data: email,
          },
          timeout: 15000,
        }),
      )

      if (data.error || !data.person) {
        this.logger.info('Datagma: no match for email', { email })
        return null
      }

      const person = data.person
      const employer =
        person.current_company?.name ?? person.company ?? null
      const industry =
        person.current_company?.industry ?? person.industry ?? null

      if (!employer && !person.job_title && !person.linkedin_url) {
        this.logger.info('Datagma: empty person data', { email })
        return null
      }

      this.logger.info('Datagma: profile enriched', {
        email,
        employer,
        jobTitle: person.job_title,
        hasLinkedin: !!person.linkedin_url,
      })

      return {
        employer,
        jobTitle: person.job_title ?? null,
        industry,
        linkedinUrl: person.linkedin_url ?? null,
        seniority: person.seniority ?? null,
      }
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 404) return null

      this.logger.warn('Datagma: enrichByEmail failed', {
        email,
        status,
        message: err?.message,
      })
      return null
    }
  }
}
