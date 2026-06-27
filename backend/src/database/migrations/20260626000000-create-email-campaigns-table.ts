import { QueryInterface, DataTypes, Sequelize } from 'sequelize'

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('email_campaigns', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.literal('uuid_generate_v4()'),
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    bodyHtml: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    audienceType: {
      type: DataTypes.ENUM(
        'everyone',
        'all_members',
        'all_parents',
        'class_years',
        'custom',
      ),
      allowNull: false,
    },
    // Array of pledge class years (integers) — only for audienceType 'class_years'
    audienceClassYears: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    // For 'class_years': include the members of those years
    audienceIncludeMembers: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    // For 'class_years': include the parents of members of those years
    audienceIncludeParents: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    // Array of person UUIDs — only for audienceType 'custom'
    audiencePersonIds: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('draft', 'sent'),
      allowNull: false,
      defaultValue: 'draft',
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    recipientCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    createdByUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
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

  await queryInterface.addIndex('email_campaigns', ['status'], {
    name: 'idx_email_campaigns_status',
  })

  await queryInterface.addIndex('email_campaigns', ['createdByUserId'], {
    name: 'idx_email_campaigns_created_by_user_id',
  })
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('email_campaigns')
  await queryInterface.sequelize.query(
    `DROP TYPE IF EXISTS "enum_email_campaigns_audienceType";
     DROP TYPE IF EXISTS "enum_email_campaigns_status";`,
  )
}
