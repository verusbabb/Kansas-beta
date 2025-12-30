import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

/**
 * Migration: Create calendar_events table
 * This migration creates the calendar_events table for storing chapter calendar events
 * 
 * Generated: 2025-12-30
 * Run: npm run migration:run
 * Rollback: npm run migration:undo
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  // Enable UUID extension if not already enabled
  await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

  await queryInterface.createTable('calendar_events', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.literal('uuid_generate_v4()'),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    startTime: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    allDay: {
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
  await queryInterface.addIndex('calendar_events', ['startDate'], {
    name: 'idx_calendar_events_startDate',
  });

  await queryInterface.addIndex('calendar_events', ['endDate'], {
    name: 'idx_calendar_events_endDate',
  });

  await queryInterface.addIndex('calendar_events', ['startDate', 'endDate'], {
    name: 'idx_calendar_events_date_range',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('calendar_events');
}

