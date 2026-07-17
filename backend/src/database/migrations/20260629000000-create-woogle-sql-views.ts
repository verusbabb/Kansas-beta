import { QueryInterface } from 'sequelize'

/**
 * Phase-2 (Woogle text-to-SQL): privacy-masked, read-only views the agent's
 * `run_sql` tool is allowed to query. Two tiers:
 *   - woogle_members        : honors each person's share* opt-outs (regular members)
 *   - woogle_members_admin  : fuller columns for admins
 * Plus non-PII helper views for offices and family links (shared by both tiers).
 *
 * The agent is ONLY ever told about these views, and the SQL guard rejects any
 * query that references anything else — so the base tables (especially `users`,
 * which holds auth identities) are never reachable via Woogle.
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  // Safe member view — mirrors what the directory API already exposes to
  // logged-in members: city/state, email, employer/title, and LinkedIn are
  // NULLed out when the member has opted out of sharing. Address lines, ZIP,
  // phones, work email, CRM ids and timestamps are omitted entirely.
  await queryInterface.sequelize.query(`
    CREATE OR REPLACE VIEW woogle_members AS
    SELECT
      p.id,
      p."firstName"        AS first_name,
      p."lastName"         AS last_name,
      p."pledgeClassYear"  AS pledge_class_year,
      p."isMember"         AS is_member,
      p."isParent"         AS is_parent,
      CASE WHEN p."shareAddressWithLoggedInMembers"  THEN p.city  END AS city,
      CASE WHEN p."shareAddressWithLoggedInMembers"  THEN p.state END AS state,
      CASE WHEN p."shareEmailWithLoggedInMembers"    THEN p.personal_email END AS personal_email,
      CASE WHEN p."shareEmployerWithLoggedInMembers" THEN p.employer  END AS employer,
      CASE WHEN p."shareEmployerWithLoggedInMembers" THEN p.job_title END AS job_title,
      CASE WHEN p."shareLinkedInWithLoggedInMembers" THEN p."linkedinProfileUrl" END AS linkedin_url
    FROM people p
    WHERE p."deletedAt" IS NULL;
  `)

  // Admin member view — fuller columns. Still scoped to non-deleted directory
  // rows and still never touches the users/auth tables.
  await queryInterface.sequelize.query(`
    CREATE OR REPLACE VIEW woogle_members_admin AS
    SELECT
      p.id,
      p."firstName"        AS first_name,
      p."lastName"         AS last_name,
      p."pledgeClassYear"  AS pledge_class_year,
      p."isMember"         AS is_member,
      p."isParent"         AS is_parent,
      p.city,
      p.state,
      p."addressLine1"     AS address_line1,
      p.zip,
      p.personal_email,
      p.work_email,
      p."homePhone"        AS home_phone,
      p."mobilePhone"      AS mobile_phone,
      p.employer,
      p.job_title,
      p."linkedinProfileUrl" AS linkedin_url,
      p."externalContactId"  AS external_contact_id,
      p."createdAt"        AS created_at,
      p."updatedAt"        AS updated_at
    FROM people p
    WHERE p."deletedAt" IS NULL;
  `)

  // Office history — one row per office held. No sensitive PII.
  await queryInterface.sequelize.query(`
    CREATE OR REPLACE VIEW woogle_exec_history AS
    SELECT
      ea."personId"        AS person_id,
      p."firstName"        AS first_name,
      p."lastName"         AS last_name,
      ep."displayName"     AS position,
      ep.code              AS position_code,
      et.season            AS season,
      et.year              AS year,
      COALESCE(et.label, INITCAP(et.season::text) || ' ' || et.year::text) AS term_label,
      et."isCurrent"       AS is_current
    FROM exec_assignments ea
    JOIN exec_terms et      ON et.id = ea."execTermId"
    JOIN exec_positions ep  ON ep.id = ea."execPositionId"
    JOIN people p           ON p.id  = ea."personId" AND p."deletedAt" IS NULL
    WHERE ea."personId" IS NOT NULL;
  `)

  // Family / legacy links — names + pledge years + relationship type only.
  await queryInterface.sequelize.query(`
    CREATE OR REPLACE VIEW woogle_relationships AS
    SELECT
      pr."fromPersonId"      AS from_person_id,
      pf."firstName"         AS from_first_name,
      pf."lastName"          AS from_last_name,
      pf."pledgeClassYear"   AS from_pledge_year,
      pr."toPersonId"        AS to_person_id,
      pt."firstName"         AS to_first_name,
      pt."lastName"          AS to_last_name,
      pt."pledgeClassYear"   AS to_pledge_year,
      pr."relationshipType"  AS relationship_type
    FROM person_relationships pr
    JOIN people pf ON pf.id = pr."fromPersonId" AND pf."deletedAt" IS NULL
    JOIN people pt ON pt.id = pr."toPersonId"   AND pt."deletedAt" IS NULL
    WHERE pr."deletedAt" IS NULL;
  `)
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`DROP VIEW IF EXISTS woogle_relationships;`)
  await queryInterface.sequelize.query(`DROP VIEW IF EXISTS woogle_exec_history;`)
  await queryInterface.sequelize.query(`DROP VIEW IF EXISTS woogle_members_admin;`)
  await queryInterface.sequelize.query(`DROP VIEW IF EXISTS woogle_members;`)
}
