import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'
import { GoogleGenAI } from '@google/genai'

/** Embedding dimensions for gemini-embedding-001 (with MRL truncation to 768). */
export const EMBEDDING_DIMENSIONS = 768

@Injectable()
export class EmbeddingService {
  private genAI: GoogleGenAI | null = null

  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(EmbeddingService.name)
    const apiKey = process.env.GEMINI_API_KEY
    if (apiKey) {
      this.genAI = new GoogleGenAI({ apiKey })
    }
  }

  get isConfigured(): boolean {
    return !!this.genAI
  }

  /**
   * Generate a 768-dimension embedding vector for the given text.
   * Uses gemini-embedding-001 with Matryoshka Representation Learning (MRL)
   * to truncate to 768 dims — excellent quality, low storage cost.
   */
  async embed(text: string): Promise<number[]> {
    if (!this.genAI) {
      throw new ServiceUnavailableException('Embedding service not configured (missing GEMINI_API_KEY)')
    }

    const response = await this.genAI.models.embedContent({
      model: 'gemini-embedding-001',
      contents: text,
      config: { outputDimensionality: EMBEDDING_DIMENSIONS },
    })

    const values = response.embeddings?.[0]?.values
    if (!values?.length) {
      throw new Error('Gemini embedding returned empty vector')
    }

    return values
  }

  /**
   * Embed multiple texts concurrently (10 at a time).
   * Returns null for any item that fails — callers should skip nulls.
   * 10x faster than sequential for large batches (e.g. 1400 members).
   */
  async embedBatch(texts: string[]): Promise<(number[] | null)[]> {
    if (!texts.length) return []
    if (!this.genAI) {
      throw new ServiceUnavailableException('Embedding service not configured (missing GEMINI_API_KEY)')
    }

    const CONCURRENCY = 10
    const results: (number[] | null)[] = new Array(texts.length).fill(null)

    for (let i = 0; i < texts.length; i += CONCURRENCY) {
      const chunk = texts.slice(i, i + CONCURRENCY)
      const settled = await Promise.allSettled(chunk.map((t) => this.embed(t)))
      for (let j = 0; j < settled.length; j++) {
        const r = settled[j]
        if (r.status === 'fulfilled') {
          results[i + j] = r.value
        } else {
          this.logger.warn('EmbeddingService: batch item failed', {
            index: i + j,
            message: (r.reason as any)?.message,
          })
        }
      }
    }

    return results
  }
}
