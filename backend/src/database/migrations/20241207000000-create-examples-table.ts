import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

/**
 * Migration: Create guest_list table
 * This migration creates the guest_list table based on the GuestList model
 * 
 * Generated: 2024-12-07
 * Run: npm run migration:run
 * Rollback: npm run migration:undo
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  // Enable UUID extension if not already enabled
  await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

  await queryInterface.createTable('guest_list', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.literal('uuid_generate_v4()'),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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

  // Add indexes if needed
  await queryInterface.addIndex('guest_list', ['name'], {
    name: 'idx_guest_list_name',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('guest_list');
}


