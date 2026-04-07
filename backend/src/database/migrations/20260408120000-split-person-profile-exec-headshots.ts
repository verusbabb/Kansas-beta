import { QueryInterface } from 'sequelize'

/**
 * Existing `headshotFilePath` values are exec-roster uploads only. Rename that column to
 * `execRosterHeadshotFilePath` and add `profileHeadshotFilePath` for current directory/profile photos.
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`
    ALTER TABLE people ADD COLUMN IF NOT EXISTS "profileHeadshotFilePath" VARCHAR(512);
  `)
  await queryInterface.sequelize.query(`
    ALTER TABLE people RENAME COLUMN "headshotFilePath" TO "execRosterHeadshotFilePath";
  `)
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`
    ALTER TABLE people RENAME COLUMN "execRosterHeadshotFilePath" TO "headshotFilePath";
  `)
  await queryInterface.sequelize.query(`
    ALTER TABLE people DROP COLUMN IF EXISTS "profileHeadshotFilePath";
  `)
}
