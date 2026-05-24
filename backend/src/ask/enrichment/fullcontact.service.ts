import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { PinoLogger } from 'nestjs-pino'
import { firstValueFrom } from 'rxjs'

export interface FullContactProfile {
  employer: string | null
  jobTitle: string | null
  linkedinUrl: string | null
  /** 'high' when FullContact has a strong identity match, 'medium' otherwise */
  confidence: 'high' | 'medium'
}

interface FullContactResponse {
  fullName?: string
  title?: string
  organization?: string
  linkedin?: string
  details?: {
    employment?: Array<{
      current?: boolean
      name?: string
      title?: string
    }>
    linkedin?: {
      url?: string
    }
  }
}

@Injectable()
export class FullContactService {
  private readonly apiKey: string | undefined

  constructor(
    private readonly http: HttpService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(FullContactService.name)
    this.apiKey = process.env.FULLCONTACT_API_KEY
  }

  get isConfigured(): boolean {
    return !!this.apiKey
  }

  /**
   * Enrich a person using their personal email via FullContact's identity graph.
   * FullContact excels at resolving personal (Gmail/Yahoo) emails to LinkedIn profiles
   * and professional details. Returns null on miss or if not configured.
   */
  async enrichByEmail(email: string): Promise<FullContactProfile | null> {
    if (!this.apiKey || !email) return null

    try {
      const { data } = await firstValueFrom(
        this.http.post<FullContactResponse>(
          'https://api.fullcontact.com/v3/person.enrich',
          { email },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          },
        ),
      )

      // FullContact returns 200 with a body even on partial matches
      const linkedin =
        data.linkedin ??
        data.details?.linkedin?.url ??
        null

      // Prefer current employment from details array
      const currentJob = data.details?.employment?.find((e) => e.current)
      const employer = currentJob?.name ?? data.organization ?? null
      const jobTitle = currentJob?.title ?? data.title ?? null

      if (!employer && !jobTitle && !linkedin) {
        this.logger.info('FullContact: no useful data returned', { email })
        return null
      }

      this.logger.info('FullContact: profile enriched', {
        email,
        employer,
        jobTitle,
        hasLinkedin: !!linkedin,
      })

      return {
        employer,
        jobTitle,
        linkedinUrl: linkedin,
        confidence: linkedin ? 'high' : 'medium',
      }
    } catch (err: any) {
      const status = err?.response?.status
      // 404 = person not found in FullContact's identity graph
      if (status === 404) return null
      // 422 = unprocessable (bad email format, etc.)
      if (status === 422) return null

      this.logger.warn('FullContact: enrichByEmail failed', {
        email,
        status,
        message: err?.message,
      })
      return null
    }
  }
}
