import { QueryInterface, DataTypes, Sequelize } from 'sequelize'

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('rush_prospect_activities', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.literal('uuid_generate_v4()'),
      allowNull: false,
    },
    prospectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'rush_prospects', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    activityType: {
      type: DataTypes.ENUM(
        'application_received',
        'stage_change',
        'note',
        'event_attended',
        'call_logged',
        'bid_extended',
        'bid_accepted',
        'bid_declined',
      ),
      allowNull: false,
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    fromStage: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    toStage: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    rushEventId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'rush_events', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
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
  })

  await queryInterface.addIndex('rush_prospect_activities', ['prospectId'], {
    name: 'idx_rush_prospect_activities_prospect_id',
  })

  await queryInterface.addIndex('rush_prospect_activities', ['activityType'], {
    name: 'idx_rush_prospect_activities_type',
  })
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('rush_prospect_activities')
  await queryInterface.sequelize.query(
    `DROP TYPE IF EXISTS "enum_rush_prospect_activities_activity_type";`,
  )
}
