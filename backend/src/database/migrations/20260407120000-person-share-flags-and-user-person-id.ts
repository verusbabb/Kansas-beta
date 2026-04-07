import { QueryInterface } from 'sequelize'

/**
 * Chapter directory privacy: members/parents opt *out* of sharing with logged-in viewers (default true).
 * Links app users to directory rows for self-service profile.
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`
    ALTER TABLE people
      ADD COLUMN IF NOT EXISTS "shareEmailWithLoggedInMembers" BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "sharePhonesWithLoggedInMembers" BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "shareAddressWithLoggedInMembers" BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "shareLinkedInWithLoggedInMembers" BOOLEAN NOT NULL DEFAULT true;
  `)

  await queryInterface.sequelize.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS "personId" UUID NULL
      REFERENCES people(id) ON DELETE SET NULL;
  `)

  await queryInterface.sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "users_personId_unique"
    ON users ("personId")
    WHERE "personId" IS NOT NULL;
  `)
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "users_personId_unique";`)
  await queryInterface.sequelize.query(`ALTER TABLE users DROP COLUMN IF EXISTS "personId";`)
  await queryInterface.sequelize.query(`
    ALTER TABLE people
      DROP COLUMN IF EXISTS "shareLinkedInWithLoggedInMembers",
      DROP COLUMN IF EXISTS "shareAddressWithLoggedInMembers",
      DROP COLUMN IF EXISTS "sharePhonesWithLoggedInMembers",
      DROP COLUMN IF EXISTS "shareEmailWithLoggedInMembers";
  `)
}
