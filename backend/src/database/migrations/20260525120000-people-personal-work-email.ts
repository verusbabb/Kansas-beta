import { QueryInterface, DataTypes } from 'sequelize'

/**
 * Migration: rename people.email → personal_email, add work_email,
 * add share_work_email_with_logged_in_members.
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.renameColumn('people', 'email', 'personal_email')

  await queryInterface.removeIndex('people', 'idx_people_email')
  await queryInterface.addIndex('people', ['personal_email'], {
    name: 'idx_people_personal_email',
    unique: true,
  })

  await queryInterface.addColumn('people', 'work_email', {
    type: DataTypes.STRING,
    allowNull: true,
  })

  await queryInterface.addColumn('people', 'share_work_email_with_logged_in_members', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('people', 'share_work_email_with_logged_in_members')
  await queryInterface.removeColumn('people', 'work_email')

  await queryInterface.removeIndex('people', 'idx_people_personal_email')
  await queryInterface.addIndex('people', ['personal_email'], {
    name: 'idx_people_email',
    unique: true,
  })

  await queryInterface.renameColumn('people', 'personal_email', 'email')
}
