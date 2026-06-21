import { QueryInterface, DataTypes, Sequelize, WhereOptions } from 'sequelize'

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('rush_prospects', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.literal('uuid_generate_v4()'),
      allowNull: false,
    },
    rushYear: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    hometown: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    highSchool: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    major: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    classYear: {
      type: DataTypes.ENUM('freshman', 'sophomore', 'junior', 'senior', 'other'),
      allowNull: true,
    },
    enrollmentSemester: {
      type: DataTypes.ENUM('fall', 'spring'),
      allowNull: true,
    },
    enrollmentYear: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    gpa: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
    },
    actScore: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    satScore: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    sportsActivities: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    honorsAwards: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    legacyRelativePersonId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'people', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    legacyRelativeName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    legacyRelationship: {
      type: DataTypes.ENUM('father', 'grandfather', 'great_grandfather', 'uncle', 'brother', 'cousin'),
      allowNull: true,
    },
    referralSource: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    pipelineStage: {
      type: DataTypes.ENUM(
        'inquiry',
        'screened',
        'active',
        'priority',
        'bid_pending',
        'bid_extended',
        'bid_accepted',
        'bid_declined',
        'no_bid',
        'withdrawn',
      ),
      allowNull: false,
      defaultValue: 'inquiry',
    },
    assignedToUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    internalRating: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    applicationSubmittedAt: {
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

  // Unique per email + rush year (one application per rush season)
  await queryInterface.addIndex('rush_prospects', ['email', 'rushYear'], {
    name: 'idx_rush_prospects_email_rush_year',
    unique: true,
    where: { deletedAt: null } as WhereOptions,
  })

  await queryInterface.addIndex('rush_prospects', ['rushYear'], {
    name: 'idx_rush_prospects_rush_year',
  })

  await queryInterface.addIndex('rush_prospects', ['pipelineStage'], {
    name: 'idx_rush_prospects_pipeline_stage',
  })
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('rush_prospects')
  await queryInterface.sequelize.query(
    `DROP TYPE IF EXISTS "enum_rush_prospects_class_year";
     DROP TYPE IF EXISTS "enum_rush_prospects_enrollment_semester";
     DROP TYPE IF EXISTS "enum_rush_prospects_legacy_relationship";
     DROP TYPE IF EXISTS "enum_rush_prospects_pipeline_stage";`,
  )
}
