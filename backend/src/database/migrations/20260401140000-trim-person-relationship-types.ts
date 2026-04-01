import { QueryInterface } from 'sequelize'

/**
 * Gender-neutral grandparent tiers; trim female/redundant relationship codes.
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  const q = queryInterface.sequelize
  await q.query(`
    UPDATE "person_relationships"
    SET "relationshipType" = 'grandparent', "updatedAt" = NOW()
    WHERE "relationshipType" IN ('grandfather', 'grandmother');
  `)
  await q.query(`
    UPDATE "person_relationships"
    SET "relationshipType" = 'great_grandparent', "updatedAt" = NOW()
    WHERE "relationshipType" IN ('great_grandfather', 'great_grandmother');
  `)
  await q.query(`
    UPDATE "person_relationships"
    SET "relationshipType" = 'grandchild', "updatedAt" = NOW()
    WHERE "relationshipType" IN ('grandson', 'granddaughter');
  `)
  await q.query(`
    UPDATE "person_relationships"
    SET "relationshipType" = 'great_grandchild', "updatedAt" = NOW()
    WHERE "relationshipType" IN ('great_grandson', 'great_granddaughter');
  `)
  await q.query(`
    UPDATE "person_relationships"
    SET "relationshipType" = 'son', "updatedAt" = NOW()
    WHERE "relationshipType" IN ('daughter', 'child');
  `)
  await q.query(`
    UPDATE "person_relationships"
    SET "relationshipType" = 'brother', "updatedAt" = NOW()
    WHERE "relationshipType" IN ('sister', 'sibling');
  `)
  await q.query(`
    UPDATE "person_relationships"
    SET "relationshipType" = NULL, "updatedAt" = NOW()
    WHERE "relationshipType" IN ('aunt', 'niece');
  `)
}

export async function down(_queryInterface: QueryInterface): Promise<void> {
  /* Irreversible normalization. */
}
