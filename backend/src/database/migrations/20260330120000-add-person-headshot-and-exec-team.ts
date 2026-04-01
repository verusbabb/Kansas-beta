import { randomUUID } from 'node:crypto'
import { QueryInterface, DataTypes, Sequelize } from 'sequelize'

/**
 * Optional headshot path in GCS for directory members (exec display).
 * Exec team: positions catalog, terms (fall/spring per year), assignments linking person to position for a term.
 *
 * Idempotent: safe when the column or tables already exist (e.g. schema applied manually or SequelizeMeta was reset).
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  const sequelize = queryInterface.sequelize

  await sequelize.query(
    `ALTER TABLE people ADD COLUMN IF NOT EXISTS "headshotFilePath" VARCHAR(512);`,
  )

  const tables = await queryInterface.showAllTables()
  const hasTable = (name: string) => tables.includes(name)

  if (!hasTable('exec_positions')) {
    await queryInterface.createTable('exec_positions', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.literal('uuid_generate_v4()'),
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    displayName: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  })
  }

  if (!hasTable('exec_terms')) {
    await queryInterface.createTable('exec_terms', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.literal('uuid_generate_v4()'),
      allowNull: false,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    season: {
      type: DataTypes.STRING(16),
      allowNull: false,
    },
    label: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    isCurrent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  })
  }

  await sequelize.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_exec_terms_year_season') THEN
        ALTER TABLE exec_terms ADD CONSTRAINT uq_exec_terms_year_season UNIQUE (year, season);
      END IF;
    END $$;
  `)

  await sequelize.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_exec_terms_season') THEN
        ALTER TABLE exec_terms ADD CONSTRAINT chk_exec_terms_season CHECK (season IN ('fall', 'spring'));
      END IF;
    END $$;
  `)

  if (!hasTable('exec_assignments')) {
    await queryInterface.createTable('exec_assignments', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.literal('uuid_generate_v4()'),
      allowNull: false,
    },
    execTermId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'exec_terms', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    execPositionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'exec_positions', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    personId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'people', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  })
  }

  await sequelize.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_exec_assignments_term_position') THEN
        ALTER TABLE exec_assignments ADD CONSTRAINT uq_exec_assignments_term_position UNIQUE ("execTermId", "execPositionId");
      END IF;
    END $$;
  `)

  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_exec_assignments_term ON exec_assignments ("execTermId");`,
  )
  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_exec_assignments_person ON exec_assignments ("personId");`,
  )

  /* Kept in sync with 20260330140000-replace-exec-positions-catalog.ts for greenfield installs. */
  const positions: { code: string; displayName: string; sortOrder: number }[] = [
    { code: 'president', displayName: 'President', sortOrder: 10 },
    { code: 'vice_president', displayName: 'Vice President', sortOrder: 20 },
    { code: 'pledge_trainer', displayName: 'Pledge Trainer', sortOrder: 30 },
    { code: 'treasurer', displayName: 'Treasurer', sortOrder: 40 },
    { code: 'risk_management', displayName: 'Risk Management', sortOrder: 50 },
    { code: 'vice_president_external', displayName: 'Vice President External', sortOrder: 60 },
    { code: 'rush_chair', displayName: 'Rush Chair', sortOrder: 70 },
    { code: 'rush_chair_2', displayName: 'Rush Chair', sortOrder: 80 },
    { code: 'rush_chair_3', displayName: 'Rush Chair', sortOrder: 90 },
    { code: 'scholarship', displayName: 'Scholarship', sortOrder: 100 },
    { code: 'social_chair', displayName: 'Social Chair', sortOrder: 110 },
    { code: 'social_chair_2', displayName: 'Social Chair', sortOrder: 120 },
    { code: 'customs_and_traditions', displayName: 'Customs and Traditions', sortOrder: 130 },
    { code: 'house_manager', displayName: 'House Manager', sortOrder: 140 },
    { code: 'secretary', displayName: 'Secretary', sortOrder: 150 },
    { code: 'brotherhood_chair', displayName: 'Brotherhood Chair', sortOrder: 160 },
    { code: 'brotherhood_chair_2', displayName: 'Brotherhood Chair', sortOrder: 170 },
    { code: 'director_of_cleaning', displayName: 'Director of Cleaning', sortOrder: 180 },
  ]

  const [countRows] = await sequelize.query(
    `SELECT COUNT(*)::text AS cnt FROM exec_positions`,
    {},
  )
  const positionCount = Number((countRows as { cnt: string }[])[0]?.cnt ?? 0)
  if (positionCount === 0) {
    const now = new Date()
    await queryInterface.bulkInsert(
      'exec_positions',
      positions.map((p) => ({
        id: randomUUID(),
        code: p.code,
        displayName: p.displayName,
        sortOrder: p.sortOrder,
        createdAt: now,
        updatedAt: now,
      })),
    )
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  const sequelize = queryInterface.sequelize
  await sequelize.query('DROP TABLE IF EXISTS exec_assignments CASCADE;')
  await sequelize.query(`ALTER TABLE exec_terms DROP CONSTRAINT IF EXISTS chk_exec_terms_season;`)
  await sequelize.query('DROP TABLE IF EXISTS exec_terms CASCADE;')
  await sequelize.query('DROP TABLE IF EXISTS exec_positions CASCADE;')
  await sequelize.query('ALTER TABLE people DROP COLUMN IF EXISTS "headshotFilePath";')
}
