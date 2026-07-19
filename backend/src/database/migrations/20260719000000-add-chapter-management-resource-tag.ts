import { QueryInterface } from 'sequelize'

/**
 * Add `chapter_management` to the resources.tag enum.
 *
 * Postgres only allows enum values to be *added*, not removed, so `down` is a
 * no-op (consistent with the project's other enum migrations).
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  const q = queryInterface.sequelize
  await q.query(`ALTER TYPE "enum_resources_tag" ADD VALUE IF NOT EXISTS 'chapter_management';`)
}

export async function down(): Promise<void> {
  /* Irreversible: Postgres enum values cannot be dropped. */
}
