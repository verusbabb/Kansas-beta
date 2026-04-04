import { QueryInterface } from 'sequelize'

/**
 * Split directory phone into optional home/mobile; legacy `phone` → mobile.
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  const sequelize = queryInterface.sequelize

  await sequelize.query(
    `ALTER TABLE people ADD COLUMN IF NOT EXISTS "homePhone" VARCHAR(255);`,
  )
  await sequelize.query(
    `ALTER TABLE people ADD COLUMN IF NOT EXISTS "mobilePhone" VARCHAR(255);`,
  )

  // Legacy column may already be gone (manual schema / partial run); only migrate when present.
  await sequelize.query(`
    DO $migrate$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'people' AND column_name = 'phone'
      ) THEN
        UPDATE people
        SET "mobilePhone" = phone
        WHERE phone IS NOT NULL AND TRIM(phone::text) <> '';
        ALTER TABLE people DROP COLUMN phone;
      END IF;
    END $migrate$;
  `)
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  const sequelize = queryInterface.sequelize

  await sequelize.query(`ALTER TABLE people ADD COLUMN IF NOT EXISTS phone VARCHAR(255);`)

  await sequelize.query(`
    UPDATE people
    SET phone = COALESCE("mobilePhone", "homePhone")
    WHERE COALESCE("mobilePhone", "homePhone") IS NOT NULL;
  `)

  await sequelize.query(`ALTER TABLE people DROP COLUMN IF EXISTS "homePhone";`)
  await sequelize.query(`ALTER TABLE people DROP COLUMN IF EXISTS "mobilePhone";`)
}
