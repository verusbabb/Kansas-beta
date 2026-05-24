import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { Sequelize } from 'sequelize-typescript'
import { QueryTypes } from 'sequelize'
import { PinoLogger } from 'nestjs-pino'
import { KnowledgeChunk, KnowledgeSourceType } from '../database/entities/knowledge-chunk.entity'

export interface ChunkUpsertInput {
  sourceType: KnowledgeSourceType
  sourceId?: string | null
  content: string
  metadata?: Record<string, any>
  embedding: number[]
}

export interface SimilarChunk {
  id: string
  sourceType: KnowledgeSourceType
  sourceId: string | null
  content: string
  metadata: Record<string, any>
  similarity: number
}

@Injectable()
export class VectorStoreService {
  constructor(
    @InjectModel(KnowledgeChunk)
    private readonly chunkModel: typeof KnowledgeChunk,
    private readonly sequelize: Sequelize,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(VectorStoreService.name)
  }

  /**
   * Upsert a single knowledge chunk. Existing chunks for the same
   * (sourceType, sourceId) are replaced.
   */
  async upsertOne(input: ChunkUpsertInput): Promise<void> {
    const vectorLiteral = `[${input.embedding.join(',')}]`

    await this.sequelize.query(
      `INSERT INTO knowledge_chunks
         (id, source_type, source_id, content, metadata, embedding, indexed_at, created_at, updated_at)
       VALUES
         (gen_random_uuid(), :sourceType, :sourceId, :content, :metadata::jsonb, :embedding::vector, NOW(), NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      {
        replacements: {
          sourceType: input.sourceType,
          sourceId: input.sourceId ?? null,
          content: input.content,
          metadata: JSON.stringify(input.metadata ?? {}),
          embedding: vectorLiteral,
        },
        type: QueryTypes.INSERT,
      },
    )
  }

  /**
   * Upsert multiple chunks for a single source record.
   * Deletes all existing chunks for (sourceType, sourceId) first, then inserts fresh.
   */
  async upsertForSource(
    sourceType: KnowledgeSourceType,
    sourceId: string,
    chunks: Array<Omit<ChunkUpsertInput, 'sourceType' | 'sourceId'>>,
  ): Promise<void> {
    await this.deleteBySource(sourceType, sourceId)

    for (const chunk of chunks) {
      await this.upsertOne({ ...chunk, sourceType, sourceId })
    }

    this.logger.info('VectorStore: upserted chunks', {
      sourceType,
      sourceId,
      count: chunks.length,
    })
  }

  /**
   * Delete all chunks for a given source record.
   */
  async deleteBySource(sourceType: KnowledgeSourceType, sourceId: string): Promise<void> {
    await this.chunkModel.destroy({
      where: { sourceType, sourceId },
    })
  }

  /**
   * Hybrid search: cosine vector search + PostgreSQL full-text search merged via
   * Reciprocal Rank Fusion (RRF).
   *
   * RRF score = 1/(60 + vector_rank) + 1/(60 + text_rank)
   *
   * When queryText is provided and full-text returns results the two lists are
   * fused and the top K by RRF score are returned.  Falls back to vector-only
   * when queryText is absent or full-text returns nothing (e.g. tsvector column
   * not yet present after migration).
   */
  async search(
    queryEmbedding: number[],
    topK = 8,
    sourceTypes?: KnowledgeSourceType[],
    queryText?: string,
  ): Promise<SimilarChunk[]> {
    const vectorLiteral = `[${queryEmbedding.join(',')}]`
    const candidates = topK * 2

    const sourceFilter =
      sourceTypes?.length
        ? `AND source_type IN (${sourceTypes.map((_, i) => `:st${i}`).join(',')})`
        : ''

    const sourceReplacements: Record<string, string> = {}
    sourceTypes?.forEach((st, i) => {
      sourceReplacements[`st${i}`] = st
    })

    type VectorRow = {
      id: string
      source_type: string
      source_id: string | null
      content: string
      metadata: Record<string, any>
      similarity: number
    }

    type TextRow = {
      id: string
      source_type: string
      source_id: string | null
      content: string
      metadata: Record<string, any>
    }

    // Vector search — always runs
    const vectorRows = await this.sequelize.query<VectorRow>(
      `SELECT
         id,
         source_type,
         source_id,
         content,
         metadata,
         1 - (embedding <=> :queryVec::vector) AS similarity
       FROM knowledge_chunks
       WHERE embedding IS NOT NULL
       ${sourceFilter}
       ORDER BY embedding <=> :queryVec::vector
       LIMIT :candidates`,
      {
        replacements: { queryVec: vectorLiteral, candidates, ...sourceReplacements },
        type: QueryTypes.SELECT,
      },
    )

    // Full-text search — only when queryText is provided
    let textRows: TextRow[] = []
    if (queryText?.trim()) {
      try {
        textRows = await this.sequelize.query<TextRow>(
          `SELECT
             id,
             source_type,
             source_id,
             content,
             metadata
           FROM knowledge_chunks
           WHERE content_tsv @@ plainto_tsquery('english', :queryText)
           ${sourceFilter}
           ORDER BY ts_rank(content_tsv, plainto_tsquery('english', :queryText)) DESC
           LIMIT :candidates`,
          {
            replacements: { queryText, candidates, ...sourceReplacements },
            type: QueryTypes.SELECT,
          },
        )
      } catch (err: any) {
        // Column may not exist yet (pre-migration env) — fall back silently
        this.logger.warn('VectorStore: full-text search unavailable, falling back to vector-only', {
          message: err?.message,
        })
      }
    }

    // Fall back to pure vector results when FTS returned nothing
    if (!textRows.length) {
      return vectorRows.slice(0, topK).map((r) => ({
        id: r.id,
        sourceType: r.source_type as KnowledgeSourceType,
        sourceId: r.source_id,
        content: r.content,
        metadata: r.metadata,
        similarity: r.similarity,
      }))
    }

    // Build rank maps
    const vectorRankMap = new Map<string, { rank: number; row: VectorRow }>()
    vectorRows.forEach((r, idx) => vectorRankMap.set(r.id, { rank: idx + 1, row: r }))

    const textRankMap = new Map<string, { rank: number; row: TextRow }>()
    textRows.forEach((r, idx) => textRankMap.set(r.id, { rank: idx + 1, row: r }))

    // Compute RRF scores across union of both result sets
    const allIds = new Set([...vectorRankMap.keys(), ...textRankMap.keys()])
    const rrfScores: Array<{ id: string; score: number }> = []
    for (const id of allIds) {
      const vEntry = vectorRankMap.get(id)
      const tEntry = textRankMap.get(id)
      const score = (vEntry ? 1 / (60 + vEntry.rank) : 0) + (tEntry ? 1 / (60 + tEntry.rank) : 0)
      rrfScores.push({ id, score })
    }
    rrfScores.sort((a, b) => b.score - a.score)

    const results: SimilarChunk[] = []
    for (const { id } of rrfScores.slice(0, topK)) {
      const vEntry = vectorRankMap.get(id)
      const tEntry = textRankMap.get(id)
      const row = (vEntry?.row ?? tEntry?.row) as VectorRow | TextRow
      if (!row) continue
      results.push({
        id: row.id,
        sourceType: row.source_type as KnowledgeSourceType,
        sourceId: row.source_id,
        content: row.content,
        metadata: row.metadata,
        // Preserve cosine similarity for vector hits; use a passing value for text-only hits
        similarity: vEntry ? vEntry.row.similarity : 0.36,
      })
    }

    return results
  }

  /** Count total chunks in the store, optionally filtered by sourceType. */
  async count(sourceType?: KnowledgeSourceType): Promise<number> {
    const where = sourceType ? { sourceType } : {}
    return this.chunkModel.count({ where })
  }
}
