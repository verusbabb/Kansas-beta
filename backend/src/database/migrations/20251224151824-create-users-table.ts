import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

/**
 * Migration: Create users table
 * This migration creates the users table for storing user accounts with authentication and authorization
 * 
 * Generated: 2025-12-24
 * Run: npm run migration:run
 * Rollback: npm run migration:undo
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  // Enable UUID extension if not already enabled
  await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

  await queryInterface.createTable('users', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.literal('uuid_generate_v4()'),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('viewer', 'editor', 'admin'),
      allowNull: false,
      defaultValue: 'viewer',
    },
    auth0Id: {
      type: DataTypes.STRING,
      allowNull: true, // NULL until user signs up in Auth0
      unique: true,
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
  await queryInterface.addIndex('users', ['email'], {
    name: 'idx_users_email',
    unique: true,
  });

  await queryInterface.addIndex('users', ['auth0Id'], {
    name: 'idx_users_auth0Id',
    unique: true,
  });

  await queryInterface.addIndex('users', ['role'], {
    name: 'idx_users_role',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('users');
}

