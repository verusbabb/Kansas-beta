import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

/**
 * Migration: Create people table (chapter directory: members and/or parents)
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

  await queryInterface.createTable('people', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.literal('uuid_generate_v4()'),
      allowNull: false,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    addressLine1: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING(2),
      allowNull: false,
    },
    zip: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pledgeClassYear: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    isMember: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isParent: {
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

  await queryInterface.addIndex('people', ['email'], {
    name: 'idx_people_email',
    unique: true,
  });

  await queryInterface.addIndex('people', ['pledgeClassYear'], {
    name: 'idx_people_pledge_class_year',
  });

  await queryInterface.sequelize.query(`
    ALTER TABLE people
    ADD CONSTRAINT chk_people_member_or_parent
    CHECK ("isMember" = true OR "isParent" = true);
  `);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`
    ALTER TABLE people DROP CONSTRAINT IF EXISTS chk_people_member_or_parent;
  `);
  await queryInterface.dropTable('people');
}
