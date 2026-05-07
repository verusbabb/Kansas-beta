import { QueryInterface, DataTypes, Sequelize } from 'sequelize'

/**
 * Migration: Create rush_photos table
 * Photos displayed on the public /rush page below the events timeline.
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')

  await queryInterface.createTable('rush_photos', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.literal('uuid_generate_v4()'),
      allowNull: false,
    },
    filePath: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    caption: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    uploadedBy: {
      type: DataTypes.STRING(255),
      allowNull: false,
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
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  })

  await queryInterface.addIndex('rush_photos', ['sortOrder'], {
    name: 'idx_rush_photos_sortOrder',
  })

  await queryInterface.addIndex('rush_photos', ['uploadedBy'], {
    name: 'idx_rush_photos_uploadedBy',
  })
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('rush_photos')
}
