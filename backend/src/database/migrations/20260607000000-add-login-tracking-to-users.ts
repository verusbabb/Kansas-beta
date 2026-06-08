import { QueryInterface, DataTypes } from 'sequelize'

/**
 * Migration: add last_login_at and login_count to users table.
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn('users', 'last_login_at', {
    type: DataTypes.DATE,
    allowNull: true,
  })

  await queryInterface.addColumn('users', 'login_count', {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('users', 'login_count')
  await queryInterface.removeColumn('users', 'last_login_at')
}
