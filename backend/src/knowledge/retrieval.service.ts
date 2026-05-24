import { Injectable } from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'
import { EmbeddingService } from './embedding.service'
import { VectorStoreService, SimilarChunk } from './vector-store.service'
import type { KnowledgeSourceType } from '../database/entities/knowledge-chunk.entity'

export interface RetrievalResult {
  chunks: SimilarChunk[]
  contextText: string
}

/** Minimum cosine similarity to include a chunk in results. */
const MIN_SIMILARITY = 0.35

@Injectable()
export class RetrievalService {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStore: VectorStoreService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RetrievalService.name)
  }

  /**
   * Search the knowledge base for chunks relevant to the query.
   *
   * @param query       Natural language query text
   * @param topK        Number of chunks to retrieve (default 25)
   * @param sourceTypes Optional filter to specific source types
   * @returns chunks + a pre-formatted context string for LLM prompts
   */
  async search(
    query: string,
    topK = 25,
    sourceTypes?: KnowledgeSourceType[],
  ): Promise<RetrievalResult> {
    if (!this.embeddingService.isConfigured) {
      return { chunks: [], contextText: '' }
    }

    const queryEmbedding = await this.embeddingService.embed(query)
    const rawChunks = await this.vectorStore.search(queryEmbedding, topK, sourceTypes, query)

    // Filter below similarity threshold
    const chunks = rawChunks.filter((c) => c.similarity >= MIN_SIMILARITY)

    this.logger.info('RetrievalService: search complete', {
      query: query.slice(0, 80),
      rawCount: rawChunks.length,
      filteredCount: chunks.length,
    })

    // Build context text for LLM — numbered, easy to reference
    const contextText = chunks
      .map((c, i) => `[${i + 1}] (${c.sourceType}) ${c.content}`)
      .join('\n\n')

    return { chunks, contextText }
  }
}
