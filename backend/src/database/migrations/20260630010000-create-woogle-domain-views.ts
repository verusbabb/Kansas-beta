import { QueryInterface } from 'sequelize'

/**
 * Broadens Woogle's read-only data coverage with privacy-aware views across the
 * remaining domains, each tagged (in WoogleSqlService's registry) with the role
 * tier that may query it:
 *
 *   safe  (any logged-in member): calendar, rush schedule, newsletters (meta),
 *         house mom, history photo captions, resource documents
 *   rush  (rush chairs + admins):  rush prospect activity log
 *   admin (admins only):           email campaigns + per-recipient engagement,
 *         person enrichment cache, guest list
 *
 * Deliberately NOT exposed in any tier (no view created):
 *   - users               (auth identities / auth0Id)
 *   - knowledge_chunks    (vector embeddings; internal)
 *   - hero_images, rush_photos, resource_versions, rush_page_widgets
 *                         (CMS imagery / file blobs / page content — low Q&A value;
 *                          page content is already searchable via search_knowledge)
 *
 * All views are read-only, filter soft-deleted rows where the source table is
 * paranoid, and never reference the users/auth tables.
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  const q = queryInterface.sequelize

  // --- safe: chapter calendar ------------------------------------------------
  await q.query(`
    CREATE OR REPLACE VIEW woogle_calendar_events AS
    SELECT
      id,
      name,
      description,
      "startDate" AS start_date,
      "endDate"   AS end_date,
      "startTime" AS start_time,
      "endTime"   AS end_time,
      "allDay"    AS all_day
    FROM calendar_events
    WHERE "deletedAt" IS NULL;
  `)

  // --- safe: public rush schedule -------------------------------------------
  await q.query(`
    CREATE OR REPLACE VIEW woogle_rush_events AS
    SELECT
      id,
      title,
      "displayDate" AS display_date,
      description,
      location,
      "timeLabel"   AS time_label,
      "sortOrder"   AS sort_order
    FROM rush_events
    WHERE "deletedAt" IS NULL;
  `)

  // --- safe: newsletter issues (metadata; content is in knowledge base) -----
  await q.query(`
    CREATE OR REPLACE VIEW woogle_newsletters AS
    SELECT
      id,
      season,
      year,
      "createdAt" AS created_at
    FROM newsletters
    WHERE "deletedAt" IS NULL;
  `)

  // --- safe: house mom (singleton; contact details intentionally omitted) ---
  await q.query(`
    CREATE OR REPLACE VIEW woogle_house_mom AS
    SELECT
      id,
      "firstName" AS first_name,
      "lastName"  AS last_name,
      "bioHtml"   AS bio_html,
      ("photoFilePath" IS NOT NULL) AS has_photo
    FROM house_mom;
  `)

  // --- safe: historical photo captions --------------------------------------
  await q.query(`
    CREATE OR REPLACE VIEW woogle_history_images AS
    SELECT
      id,
      caption,
      "altText"    AS alt_text,
      "sortOrder"  AS sort_order,
      "uploadedBy" AS uploaded_by
    FROM history_images
    WHERE "deletedAt" IS NULL;
  `)

  // --- safe: member resource documents --------------------------------------
  await q.query(`
    CREATE OR REPLACE VIEW woogle_resources AS
    SELECT
      id,
      title,
      description,
      tag,
      "uploadedBy" AS uploaded_by,
      "createdAt"  AS created_at
    FROM resources
    WHERE "deletedAt" IS NULL;
  `)

  // --- rush: prospect activity log ------------------------------------------
  await q.query(`
    CREATE OR REPLACE VIEW woogle_rush_activities AS
    SELECT
      a.id,
      a."prospectId"   AS prospect_id,
      rp."firstName"   AS prospect_first_name,
      rp."lastName"    AS prospect_last_name,
      a."activityType" AS activity_type,
      a.note,
      a."fromStage"    AS from_stage,
      a."toStage"      AS to_stage,
      a."rushEventId"  AS rush_event_id,
      a."createdAt"    AS created_at
    FROM rush_prospect_activities a
    JOIN rush_prospects rp ON rp.id = a."prospectId" AND rp."deletedAt" IS NULL;
  `)

  // --- admin: email campaigns ------------------------------------------------
  await q.query(`
    CREATE OR REPLACE VIEW woogle_email_campaigns AS
    SELECT
      id,
      subject,
      "audienceType"   AS audience_type,
      status,
      "sentAt"         AS sent_at,
      "recipientCount" AS recipient_count,
      "createdAt"      AS created_at
    FROM email_campaigns
    WHERE "deletedAt" IS NULL;
  `)

  // --- admin: per-recipient email engagement --------------------------------
  await q.query(`
    CREATE OR REPLACE VIEW woogle_email_recipients AS
    SELECT
      id,
      "campaignId"   AS campaign_id,
      "personId"     AS person_id,
      "firstName"    AS first_name,
      "lastName"     AS last_name,
      email,
      status,
      "deliveredAt"  AS delivered_at,
      "openedAt"     AS opened_at,
      "openCount"    AS open_count,
      "bounceReason" AS bounce_reason,
      "lastEventAt"  AS last_event_at,
      "createdAt"    AS created_at
    FROM email_campaign_recipients
    WHERE "deletedAt" IS NULL;
  `)

  // --- admin: cached third-party enrichment (person_enrichments is underscored) ---
  await q.query(`
    CREATE OR REPLACE VIEW woogle_person_enrichment AS
    SELECT
      person_id,
      employer,
      job_title,
      industry,
      headline,
      linkedin_url_discovered,
      source,
      confidence,
      enriched_at
    FROM person_enrichments;
  `)

  // --- admin: event guest list ----------------------------------------------
  await q.query(`
    CREATE OR REPLACE VIEW woogle_guest_list AS
    SELECT
      id,
      name,
      active
    FROM guest_list
    WHERE "deletedAt" IS NULL;
  `)
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  const q = queryInterface.sequelize
  for (const view of [
    'woogle_guest_list',
    'woogle_person_enrichment',
    'woogle_email_recipients',
    'woogle_email_campaigns',
    'woogle_rush_activities',
    'woogle_resources',
    'woogle_history_images',
    'woogle_house_mom',
    'woogle_newsletters',
    'woogle_rush_events',
    'woogle_calendar_events',
  ]) {
    await q.query(`DROP VIEW IF EXISTS ${view};`)
  }
}
