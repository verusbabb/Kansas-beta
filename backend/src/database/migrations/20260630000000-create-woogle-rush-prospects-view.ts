import { QueryInterface } from 'sequelize'

/**
 * Woogle rush-CRM view. Exposes the rush prospect pipeline to the agent's
 * `run_sql` tool, but ONLY for viewers the app already trusts with rush data
 * (rush chairs and admins — enforced in AskController / AskService, not here).
 *
 * Like the other woogle_* views this is read-only and never references the
 * `users`/auth tables. It rolls each prospect's append-only activity log up into
 * convenience aggregates so questions like "rush candidates we haven't responded
 * to" become a simple SELECT:
 *
 *   - activity_count       total logged activities
 *   - last_activity_at     most recent activity of any type
 *   - last_activity_type   that activity's type
 *   - last_contact_at      most recent OUTREACH (note/call/bid_*) — null = never contacted
 *   - needs_response       prospect still open AND never contacted by us
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`
    CREATE OR REPLACE VIEW woogle_rush_prospects AS
    SELECT
      rp.id,
      rp."rushYear"               AS rush_year,
      rp."firstName"              AS first_name,
      rp."lastName"               AS last_name,
      rp.email,
      rp.phone,
      rp.hometown,
      rp."highSchool"             AS high_school,
      rp.major,
      rp."classYear"              AS class_year,
      rp.gpa,
      rp."pipelineStage"          AS pipeline_stage,
      rp."internalRating"         AS internal_rating,
      rp."referralSource"         AS referral_source,
      rp."legacyRelativeName"     AS legacy_relative_name,
      rp."legacyRelationship"     AS legacy_relationship,
      rp."legacyRelativePersonId" AS legacy_relative_person_id,
      rp."assignedToPersonId"     AS assigned_to_person_id,
      NULLIF(TRIM(COALESCE(ap."firstName", '') || ' ' || COALESCE(ap."lastName", '')), '')
                                  AS assigned_to_name,
      rp."applicationSubmittedAt" AS application_submitted_at,
      rp."createdAt"              AS created_at,
      rp."updatedAt"              AS updated_at,
      COALESCE(act.activity_count, 0) AS activity_count,
      act.last_activity_at,
      act.last_activity_type,
      act.last_contact_at,
      (
        rp."pipelineStage" NOT IN ('bid_accepted', 'bid_declined', 'no_bid', 'withdrawn')
        AND act.last_contact_at IS NULL
      )                           AS needs_response
    FROM rush_prospects rp
    LEFT JOIN people ap
      ON ap.id = rp."assignedToPersonId" AND ap."deletedAt" IS NULL
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)                                                       AS activity_count,
        MAX(a."createdAt")                                            AS last_activity_at,
        (ARRAY_AGG(a."activityType" ORDER BY a."createdAt" DESC))[1]  AS last_activity_type,
        MAX(a."createdAt") FILTER (
          WHERE a."activityType" IN ('note', 'call_logged', 'bid_extended', 'bid_accepted', 'bid_declined')
        )                                                             AS last_contact_at
      FROM rush_prospect_activities a
      WHERE a."prospectId" = rp.id
    ) act ON true
    WHERE rp."deletedAt" IS NULL;
  `)
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`DROP VIEW IF EXISTS woogle_rush_prospects;`)
}
