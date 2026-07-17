import { Injectable } from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'
import { GoogleGenAI } from '@google/genai'
import { EmbeddingService } from './embedding.service'
import { VectorStoreService, SimilarChunk } from './vector-store.service'
import type { KnowledgeSourceType } from '../database/entities/knowledge-chunk.entity'

export interface RetrievalResult {
  chunks: SimilarChunk[]
  contextText: string
}

export interface SearchOptions {
  /** When true, over-fetch candidates and LLM-rerank for higher precision. */
  rerank?: boolean
}

/** Minimum cosine similarity to include a chunk in results. */
const MIN_SIMILARITY = 0.35

/** Model used for cross-encoder-style LLM reranking. */
const RERANK_MODEL = 'gemini-2.5-flash'

@Injectable()
export class RetrievalService {
  private genAI: GoogleGenAI | null = null

  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStore: VectorStoreService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RetrievalService.name)
    const apiKey = process.env.GEMINI_API_KEY
    if (apiKey) {
      this.genAI = new GoogleGenAI({ apiKey })
    }
  }

  /**
   * Search the knowledge base for chunks relevant to the query.
   *
   * @param query       Natural language query text
   * @param topK        Number of chunks to return (default 25)
   * @param sourceTypes Optional filter to specific source types
   * @param opts        Optional behavior flags (e.g. { rerank: true })
   * @returns chunks + a pre-formatted context string for LLM prompts
   */
  async search(
    query: string,
    topK = 25,
    sourceTypes?: KnowledgeSourceType[],
    opts?: SearchOptions,
  ): Promise<RetrievalResult> {
    if (!this.embeddingService.isConfigured) {
      return { chunks: [], contextText: '' }
    }

    // When reranking, over-fetch candidates so the reranker has more to choose
    // from, then narrow down to topK afterwards.
    const candidateK = opts?.rerank ? Math.max(topK * 2, 30) : topK

    const queryEmbedding = await this.embeddingService.embed(query)
    const rawChunks = await this.vectorStore.search(queryEmbedding, candidateK, sourceTypes, query)

    // Filter below similarity threshold
    let chunks = rawChunks.filter((c) => c.similarity >= MIN_SIMILARITY)

    let reranked = false
    if (opts?.rerank && chunks.length > topK) {
      const ordered = await this.rerank(query, chunks, topK)
      if (ordered) {
        chunks = ordered
        reranked = true
      } else {
        chunks = chunks.slice(0, topK)
      }
    } else {
      chunks = chunks.slice(0, topK)
    }

    this.logger.info('RetrievalService: search complete', {
      query: query.slice(0, 80),
      rawCount: rawChunks.length,
      returnedCount: chunks.length,
      reranked,
    })

    // Build context text for LLM — numbered, easy to reference
    const contextText = chunks
      .map((c, i) => `[${i + 1}] (${c.sourceType}) ${c.content}`)
      .join('\n\n')

    return { chunks, contextText }
  }

  /**
   * LLM reranker: scores candidate passages against the query and returns them
   * reordered (most relevant first), dropping clearly irrelevant ones. Returns
   * null on any failure so the caller can fall back to vector ordering.
   */
  private async rerank(
    query: string,
    candidates: SimilarChunk[],
    topK: number,
  ): Promise<SimilarChunk[] | null> {
    if (!this.genAI) return null

    const list = candidates
      .map((c, i) => `[${i}] (${c.sourceType}) ${c.content.slice(0, 600)}`)
      .join('\n\n')

    const prompt = `You are a search reranker. Given a user query and numbered passages, return the passage indices ordered from most to least relevant. Include ONLY passages that genuinely help answer the query; omit irrelevant ones.

Return ONLY a JSON array of integers, e.g. [3,0,7].

Query: ${query}

Passages:
${list}`

    try {
      const result = await this.genAI.models.generateContent({
        model: RERANK_MODEL,
        contents: prompt,
        config: { responseMimeType: 'application/json', temperature: 0 },
      })
      const order = JSON.parse(result.text ?? '[]') as unknown
      if (!Array.isArray(order)) return null
      const picked = order
        .filter((i): i is number => Number.isInteger(i) && i >= 0 && i < candidates.length)
        .map((i) => candidates[i])
      if (!picked.length) return null
      return picked.slice(0, topK)
    } catch (err: any) {
      this.logger.warn('RetrievalService: rerank failed, using vector order', {
        message: err?.message,
      })
      return null
    }
  }
}
