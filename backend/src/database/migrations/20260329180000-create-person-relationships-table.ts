import { QueryInterface, DataTypes, Sequelize } from 'sequelize'

/**
 * Legacy / family links between directory people.
 * Semantics: fromPerson is the relationshipType of toPerson (type nullable = unspecified).
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('person_relationships', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.literal('uuid_generate_v4()'),
      allowNull: false,
    },
    fromPersonId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'people', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    toPersonId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'people', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    relationshipType: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    notes: {
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

  await queryInterface.addIndex('person_relationships', ['fromPersonId'], {
    name: 'idx_person_relationships_from_person_id',
  })

  await queryInterface.addIndex('person_relationships', ['toPersonId'], {
    name: 'idx_person_relationships_to_person_id',
  })

  await queryInterface.sequelize.query(`
    ALTER TABLE "person_relationships"
    ADD CONSTRAINT "chk_person_relationships_distinct_endpoints"
    CHECK ("fromPersonId" <> "toPersonId");
  `)

  await queryInterface.sequelize.query(`
    CREATE UNIQUE INDEX "uq_person_relationships_from_to_active"
    ON "person_relationships" ("fromPersonId", "toPersonId")
    WHERE "deletedAt" IS NULL;
  `)
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`
    DROP INDEX IF EXISTS "uq_person_relationships_from_to_active";
  `)
  await queryInterface.sequelize.query(`
    ALTER TABLE "person_relationships"
    DROP CONSTRAINT IF EXISTS "chk_person_relationships_distinct_endpoints";
  `)
  await queryInterface.dropTable('person_relationships')
}
