import { QueryInterface } from 'sequelize'

/** Optional public LinkedIn profile URL for directory members/parents. */
export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(
    `ALTER TABLE people ADD COLUMN IF NOT EXISTS "linkedinProfileUrl" VARCHAR(512);`,
  )
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(
    `ALTER TABLE people DROP COLUMN IF EXISTS "linkedinProfileUrl";`,
  )
}
