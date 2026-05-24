import { QueryInterface, DataTypes } from 'sequelize'

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Enable pgvector extension (idempotent)
  await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS vector;')

  await queryInterface.createTable('knowledge_chunks', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    source_type: {
      // person | exec_team | calendar_event | newsletter | rush_event | rush_widget | house_mom | history_image | static_page
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    source_id: {
      // UUID of the originating record (may be null for source types without a UUID key)
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    metadata: {
      // Arbitrary JSON: { title, author, season, year, newsletterId, ... }
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    // The vector(768) column is created via raw SQL because Sequelize DataTypes does not
    // natively support the pgvector type.
    indexed_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  })

  // Add the vector column (pgvector type, 768 dimensions for gemini-embedding-001)
  await queryInterface.sequelize.query(
    'ALTER TABLE knowledge_chunks ADD COLUMN embedding vector(768);',
  )

  // HNSW index for fast cosine similarity search
  await queryInterface.sequelize.query(
    `CREATE INDEX knowledge_chunks_embedding_hnsw_idx
     ON knowledge_chunks
     USING hnsw (embedding vector_cosine_ops)
     WITH (m = 16, ef_construction = 64);`,
  )

  // Standard indexes for filtering by source
  await queryInterface.addIndex('knowledge_chunks', ['source_type'], {
    name: 'knowledge_chunks_source_type_idx',
  })
  await queryInterface.addIndex('knowledge_chunks', ['source_type', 'source_id'], {
    name: 'knowledge_chunks_source_type_id_idx',
  })
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('knowledge_chunks')
}
