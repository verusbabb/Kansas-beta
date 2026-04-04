import { QueryInterface, DataTypes, Sequelize } from 'sequelize'

/**
 * Single-row table for house mom profile (photo in GCS, bio HTML).
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')

  await queryInterface.createTable('house_mom', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.literal('uuid_generate_v4()'),
      allowNull: false,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bioHtml: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    photoFilePath: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  })
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('house_mom')
}
