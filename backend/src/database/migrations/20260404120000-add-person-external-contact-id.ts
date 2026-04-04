import { QueryInterface } from 'sequelize'

/**
 * Stable ID from external CRM (e.g. Salesforce Contact ID) for import upserts.
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  const sequelize = queryInterface.sequelize

  await sequelize.query(
    `ALTER TABLE people ADD COLUMN IF NOT EXISTS "externalContactId" VARCHAR(64);`,
  )

  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_people_external_contact_id_unique
    ON people ("externalContactId")
    WHERE "externalContactId" IS NOT NULL;
  `)
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  const sequelize = queryInterface.sequelize

  await sequelize.query(`DROP INDEX IF EXISTS idx_people_external_contact_id_unique;`)
  await sequelize.query(`ALTER TABLE people DROP COLUMN IF EXISTS "externalContactId";`)
}
