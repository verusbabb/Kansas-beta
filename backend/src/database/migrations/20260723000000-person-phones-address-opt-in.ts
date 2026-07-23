import { QueryInterface } from 'sequelize'

/**
 * Chapter directory privacy: switch phones + street address to opt-in (masked by default) for
 * logged-in viewers. Guests never receive these fields; admins and self-views are unaffected.
 * Backfills all existing people to masked so the new default applies retroactively.
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`
    ALTER TABLE people
      ALTER COLUMN "sharePhonesWithLoggedInMembers" SET DEFAULT false,
      ALTER COLUMN "shareAddressWithLoggedInMembers" SET DEFAULT false;
  `)

  await queryInterface.sequelize.query(`
    UPDATE people
      SET "sharePhonesWithLoggedInMembers" = false,
          "shareAddressWithLoggedInMembers" = false;
  `)
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`
    ALTER TABLE people
      ALTER COLUMN "sharePhonesWithLoggedInMembers" SET DEFAULT true,
      ALTER COLUMN "shareAddressWithLoggedInMembers" SET DEFAULT true;
  `)

  await queryInterface.sequelize.query(`
    UPDATE people
      SET "sharePhonesWithLoggedInMembers" = true,
          "shareAddressWithLoggedInMembers" = true;
  `)
}
