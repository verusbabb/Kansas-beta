import { QueryInterface } from 'sequelize'

/**
 * Add `member` and `rush_chair` to the users.role enum.
 *
 * Postgres only allows enum values to be *added*, not removed, so `down` is a
 * no-op (consistent with the project's other enum migrations). The new values
 * are only added here, never used within this migration, so this is safe.
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  const q = queryInterface.sequelize
  await q.query(`ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'member';`)
  await q.query(`ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'rush_chair';`)
}

export async function down(): Promise<void> {
  /* Irreversible: Postgres enum values cannot be dropped. */
}
