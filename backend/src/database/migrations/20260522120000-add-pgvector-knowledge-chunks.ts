import { QueryInterface } from 'sequelize'

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Enable pgvector extension (idempotent)
  await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS vector;')

  // All statements use IF NOT EXISTS so this migration is safe to re-run against a DB
  // that was already partially set up (e.g. table created manually before this migration
  // was recorded in SequelizeMeta).

  await queryInterface.sequelize.query(`
    CREATE TABLE IF NOT EXISTS "knowledge_chunks" (
      "id"          UUID        NOT NULL,
      "source_type" VARCHAR(50) NOT NULL,
      "source_id"   VARCHAR(255),
      "content"     TEXT        NOT NULL,
      "metadata"    JSONB       NOT NULL DEFAULT '{}',
      "indexed_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY ("id")
    );
  `)

  // Add the vector column (pgvector type, 768 dimensions for gemini-embedding-001)
  await queryInterface.sequelize.query(
    'ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS embedding vector(768);',
  )

  // HNSW index for fast cosine similarity search
  await queryInterface.sequelize.query(`
    CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_hnsw_idx
    ON knowledge_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
  `)

  // Standard indexes for filtering by source
  await queryInterface.sequelize.query(`
    CREATE INDEX IF NOT EXISTS knowledge_chunks_source_type_idx
    ON knowledge_chunks (source_type);
  `)
  await queryInterface.sequelize.query(`
    CREATE INDEX IF NOT EXISTS knowledge_chunks_source_type_id_idx
    ON knowledge_chunks (source_type, source_id);
  `)
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('knowledge_chunks')
}
