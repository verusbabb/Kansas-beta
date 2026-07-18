import { QueryInterface, DataTypes } from 'sequelize'

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('person_enrichments', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    person_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: { model: 'people', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    employer: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    job_title: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    industry: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    headline: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    linkedin_url_discovered: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    source: {
      type: DataTypes.ENUM('pdl', 'fullcontact', 'datagma', 'none'),
      allowNull: false,
      defaultValue: 'none',
    },
    confidence: {
      type: DataTypes.ENUM('high', 'medium', 'low'),
      allowNull: true,
    },
    enriched_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  })

  await queryInterface.addIndex('person_enrichments', ['expires_at'], {
    name: 'person_enrichments_expires_at_idx',
  })
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('person_enrichments')
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS enum_person_enrichments_source; DROP TYPE IF EXISTS enum_person_enrichments_confidence;',
  )
}
