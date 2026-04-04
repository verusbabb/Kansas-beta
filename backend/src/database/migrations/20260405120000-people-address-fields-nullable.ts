import { QueryInterface } from 'sequelize'

/**
 * Allow partial or missing mailing address (import + manual entry).
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  const sequelize = queryInterface.sequelize
  await sequelize.query(`ALTER TABLE people ALTER COLUMN "addressLine1" DROP NOT NULL;`)
  await sequelize.query(`ALTER TABLE people ALTER COLUMN "city" DROP NOT NULL;`)
  await sequelize.query(`ALTER TABLE people ALTER COLUMN "state" DROP NOT NULL;`)
  await sequelize.query(`ALTER TABLE people ALTER COLUMN "zip" DROP NOT NULL;`)
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  const sequelize = queryInterface.sequelize
  await sequelize.query(`
    UPDATE people SET "addressLine1" = '—' WHERE "addressLine1" IS NULL;
    UPDATE people SET "city" = '—' WHERE "city" IS NULL;
    UPDATE people SET "state" = 'KS' WHERE "state" IS NULL;
    UPDATE people SET "zip" = '00000' WHERE "zip" IS NULL;
  `)
  await sequelize.query(`ALTER TABLE people ALTER COLUMN "addressLine1" SET NOT NULL;`)
  await sequelize.query(`ALTER TABLE people ALTER COLUMN "city" SET NOT NULL;`)
  await sequelize.query(`ALTER TABLE people ALTER COLUMN "state" SET NOT NULL;`)
  await sequelize.query(`ALTER TABLE people ALTER COLUMN "zip" SET NOT NULL;`)
}
