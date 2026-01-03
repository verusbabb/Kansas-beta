import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

/**
 * Migration: Create hero_images table
 * This migration creates the hero_images table for storing home page hero carousel images
 * 
 * Created: 2026-01-03
 * Run: npm run migration:run
 * Rollback: npm run migration:undo
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  // Enable UUID extension if not already enabled
  await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

  await queryInterface.createTable('hero_images', {
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    uploadedBy: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    isInCarousel: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
  await queryInterface.addIndex('hero_images', ['isInCarousel'], {
    name: 'idx_hero_images_isInCarousel',
  });

  await queryInterface.addIndex('hero_images', ['uploadedBy'], {
    name: 'idx_hero_images_uploadedBy',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('hero_images');
}

