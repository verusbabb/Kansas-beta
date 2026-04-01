import { randomUUID } from 'node:crypto'
import { QueryInterface } from 'sequelize'

/**
 * Replace exec position catalog with chapter-specific roles.
 * Clears assignments (FK) then positions, then re-seeds.
 * Safe for DBs that ran the original 10-position seed.
 */
const POSITIONS: { code: string; displayName: string; sortOrder: number }[] = [
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

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query('DELETE FROM exec_assignments')
  await queryInterface.sequelize.query('DELETE FROM exec_positions')

  const now = new Date()
  await queryInterface.bulkInsert(
    'exec_positions',
    POSITIONS.map((p) => ({
      id: randomUUID(),
      code: p.code,
      displayName: p.displayName,
      sortOrder: p.sortOrder,
      createdAt: now,
      updatedAt: now,
    })),
  )
}

export async function down(_queryInterface: QueryInterface): Promise<void> {
  /* Irreversible data migration; positions would need manual restore. */
}
