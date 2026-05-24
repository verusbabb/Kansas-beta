import { QueryInterface } from 'sequelize'

/**
 * Add a generated tsvector column for PostgreSQL full-text search.
 * The column is auto-populated from `content` on every insert/update.
 * Phase 2 hybrid search (vector + FTS via RRF) depends on this column.
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`
    ALTER TABLE knowledge_chunks
    ADD COLUMN content_tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;
  `)

  await queryInterface.sequelize.query(`
    CREATE INDEX knowledge_chunks_tsv_idx ON knowledge_chunks USING GIN(content_tsv);
  `)
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`DROP INDEX IF EXISTS knowledge_chunks_tsv_idx;`)
  await queryInterface.sequelize.query(
    `ALTER TABLE knowledge_chunks DROP COLUMN IF EXISTS content_tsv;`,
  )
}
