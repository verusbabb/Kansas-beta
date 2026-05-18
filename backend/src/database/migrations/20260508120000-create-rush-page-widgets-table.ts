import { QueryInterface, DataTypes, Sequelize } from 'sequelize'

const DEFAULT_WIDGETS = [
  {
    slotIndex: 0,
    title: 'Lifelong Brotherhood',
    bodyHtml:
      '<p>Build lasting friendships and connections that extend far beyond your college years.</p>',
  },
  {
    slotIndex: 1,
    title: 'Academic Excellence',
    bodyHtml: '<p>Join a community that values scholarship and supports your academic success.</p>',
  },
  {
    slotIndex: 2,
    title: 'Leadership Development',
    bodyHtml: '<p>Develop leadership skills through chapter positions and campus involvement.</p>',
  },
  {
    slotIndex: 3,
    title: 'Professional Network',
    bodyHtml: '<p>Connect with alumni and brothers who can help launch your career.</p>',
  },
]

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')

  await queryInterface.createTable('rush_page_widgets', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.literal('uuid_generate_v4()'),
      allowNull: false,
    },
    slotIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    bodyHtml: {
      type: DataTypes.TEXT,
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
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  })

  const now = new Date()
  for (const w of DEFAULT_WIDGETS) {
    await queryInterface.sequelize.query(
      `INSERT INTO "rush_page_widgets" ("id","slotIndex","title","bodyHtml","createdAt","updatedAt","deletedAt")
       VALUES (uuid_generate_v4(), :slotIndex, :title, :bodyHtml, :createdAt, :updatedAt, NULL)`,
      {
        replacements: {
          slotIndex: w.slotIndex,
          title: w.title,
          bodyHtml: w.bodyHtml,
          createdAt: now,
          updatedAt: now,
        },
      },
    )
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('rush_page_widgets')
}
