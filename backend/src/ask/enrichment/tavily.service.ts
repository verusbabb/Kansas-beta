import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { PinoLogger } from 'nestjs-pino'
import { firstValueFrom } from 'rxjs'

export interface TavilyResult {
  url: string
  title: string
  content: string
  score: number
}

interface TavilyResponse {
  results: TavilyResult[]
}

@Injectable()
export class TavilyService {
  private readonly apiKey: string | undefined

  constructor(
    private readonly http: HttpService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(TavilyService.name)
    this.apiKey = process.env.TAVILY_API_KEY
  }

  get isConfigured(): boolean {
    return !!this.apiKey
  }

  /**
   * Search the web for professional information about a person.
   * Returns up to 5 result snippets for Gemini to parse.
   */
  async searchProfessionalInfo(
    firstName: string,
    lastName: string,
    city?: string | null,
    state?: string | null,
  ): Promise<TavilyResult[]> {
    if (!this.apiKey) return []

    const location = [city, state].filter(Boolean).join(', ')
    const locationPart = location ? ` ${location}` : ''
    const query = `"${firstName} ${lastName}"${locationPart} professional career employer`

    try {
      const { data } = await firstValueFrom(
        this.http.post<TavilyResponse>(
          'https://api.tavily.com/search',
          {
            api_key: this.apiKey,
            query,
            search_depth: 'advanced',
            max_results: 5,
          },
          { timeout: 10000 },
        ),
      )
      this.logger.info('Tavily: professional search completed', {
        name: `${firstName} ${lastName}`,
        resultCount: data.results?.length ?? 0,
      })
      return data.results ?? []
    } catch (err: any) {
      this.logger.warn('Tavily: professional search failed', {
        name: `${firstName} ${lastName}`,
        status: err?.response?.status,
        message: err?.message,
      })
      return []
    }
  }

  /**
   * Search for a LinkedIn profile URL for the given name.
   * Returns the first linkedin.com/in/ URL found, or null.
   */
  async findLinkedInUrl(firstName: string, lastName: string): Promise<string | null> {
    if (!this.apiKey) return null

    const query = `"${firstName} ${lastName}" site:linkedin.com/in`

    try {
      const { data } = await firstValueFrom(
        this.http.post<TavilyResponse>(
          'https://api.tavily.com/search',
          {
            api_key: this.apiKey,
            query,
            search_depth: 'basic',
            max_results: 3,
            include_domains: ['linkedin.com'],
          },
          { timeout: 10000 },
        ),
      )

      const linkedInResult = data.results?.find((r) => r.url?.includes('linkedin.com/in/'))
      return linkedInResult?.url ?? null
    } catch (err: any) {
      this.logger.warn('Tavily: LinkedIn search failed', {
        name: `${firstName} ${lastName}`,
        status: err?.response?.status,
      })
      return null
    }
  }
}
