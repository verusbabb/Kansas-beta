import { QueryInterface } from 'sequelize'

/**
 * Use `parent` only for mother/father; normalize existing rows.
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`
    UPDATE "person_relationships"
    SET "relationshipType" = 'parent', "updatedAt" = NOW()
    WHERE "relationshipType" IN ('father', 'mother');
  `)
}

export async function down(_queryInterface: QueryInterface): Promise<void> {
  /* Irreversible: we cannot know which rows were father vs mother. */
}
