import { QueryInterface, DataTypes } from 'sequelize'

/**
 * Migration: add employer, job_title, and shareEmployerWithLoggedInMembers to people.
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn('people', 'employer', {
    type: DataTypes.STRING,
    allowNull: true,
  })

  await queryInterface.addColumn('people', 'job_title', {
    type: DataTypes.STRING,
    allowNull: true,
  })

  await queryInterface.sequelize.query(`
    ALTER TABLE people
      ADD COLUMN IF NOT EXISTS "shareEmployerWithLoggedInMembers" BOOLEAN NOT NULL DEFAULT true;
  `)
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`
    ALTER TABLE people DROP COLUMN IF EXISTS "shareEmployerWithLoggedInMembers";
  `)
  await queryInterface.removeColumn('people', 'job_title')
  await queryInterface.removeColumn('people', 'employer')
}
