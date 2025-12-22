import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

/**
 * Migration: Create newsletters table
 * This migration creates the newsletters table for storing chapter newsletters
 * 
 * Generated: 2024-12-21
 * Run: npm run migration:run
 * Rollback: npm run migration:undo
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  // Enable UUID extension if not already enabled
  await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

  await queryInterface.createTable('newsletters', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.literal('uuid_generate_v4()'),
      allowNull: false,
    },
    link: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    season: {
      type: DataTypes.ENUM('spring', 'summer', 'fall', 'winter'),
      allowNull: false,
    },
    year: {
      type: DataTypes.INTEGER,
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
  });

  // Add indexes for efficient queries
  await queryInterface.addIndex('newsletters', ['year'], {
    name: 'idx_newsletters_year',
  });

  await queryInterface.addIndex('newsletters', ['year', 'season'], {
    name: 'idx_newsletters_year_season',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('newsletters');
}

