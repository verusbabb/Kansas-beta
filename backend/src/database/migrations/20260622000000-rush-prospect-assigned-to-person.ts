import { QueryInterface, DataTypes } from 'sequelize'

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Drop the old user FK column (no data exists yet)
  await queryInterface.removeColumn('rush_prospects', 'assignedToUserId')

  // Add the replacement person FK column
  await queryInterface.addColumn('rush_prospects', 'assignedToPersonId', {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'people', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  })

  await queryInterface.addIndex('rush_prospects', ['assignedToPersonId'], {
    name: 'idx_rush_prospects_assigned_to_person_id',
  })
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeIndex('rush_prospects', 'idx_rush_prospects_assigned_to_person_id')
  await queryInterface.removeColumn('rush_prospects', 'assignedToPersonId')

  await queryInterface.addColumn('rush_prospects', 'assignedToUserId', {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  })
}
