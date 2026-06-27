import { QueryInterface, DataTypes, Sequelize, WhereOptions } from 'sequelize'

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('email_campaign_recipients', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.literal('uuid_generate_v4()'),
      allowNull: false,
    },
    campaignId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'email_campaigns', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    // Nullable: the directory person may be deleted later; we keep the snapshot.
    personId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'people', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    // sent → delivered → opened ; or bounced / dropped / spam
    status: {
      type: DataTypes.ENUM('sent', 'delivered', 'opened', 'bounced', 'dropped', 'spam'),
      allowNull: false,
      defaultValue: 'sent',
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    openedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    openCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    bounceReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    lastEventAt: {
      type: DataTypes.DATE,
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

  await queryInterface.addIndex('email_campaign_recipients', ['campaignId'], {
    name: 'idx_email_campaign_recipients_campaign_id',
  })

  // One snapshot row per email per campaign (active rows only)
  await queryInterface.addIndex('email_campaign_recipients', ['campaignId', 'email'], {
    name: 'idx_email_campaign_recipients_campaign_email',
    unique: true,
    where: { deletedAt: null } as WhereOptions,
  })
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('email_campaign_recipients')
  await queryInterface.sequelize.query(
    `DROP TYPE IF EXISTS "enum_email_campaign_recipients_status";`,
  )
}
