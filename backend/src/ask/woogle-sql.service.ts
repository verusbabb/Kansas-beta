import { Injectable } from '@nestjs/common'
import { Sequelize } from 'sequelize-typescript'
import { QueryTypes } from 'sequelize'
import { PinoLogger } from 'nestjs-pino'

/** Member-data masking tier: which member view applies + fuller PII for admins. */
export type SqlTier = 'safe' | 'admin'

/**
 * Access level a view requires. Derived per request from the viewer's role:
 *   - everyone logged in → { safe }
 *   - rush chair         → { safe, rush }
 *   - admin              → { safe, rush, admin }
 * Auth/identity tables (users) and internals (knowledge_chunks) are in NO tier
 * and are unreachable by anyone.
 */
type AccessLevel = 'safe' | 'rush' | 'admin'

interface WoogleViewDef {
  /** View name (must match a CREATE VIEW in the woogle_* migrations). */
  name: string
  /** Minimum access level required to see/query this view. */
  access: AccessLevel
  /** Column reference + notes shown to the model for this view. */
  schema: string
  /** Optional cross-view join hint, only surfaced when the view is available. */
  join?: string
}

/** The member directory view is tier-specific (safe-masked vs admin-fuller). */
const MEMBER_SCHEMA_SAFE =
  'woogle_members(id, first_name, last_name, pledge_class_year, is_member, is_parent, city, state, personal_email, employer, job_title, linkedin_url) — some columns are NULL when the member opted out of sharing'
const MEMBER_SCHEMA_ADMIN =
  'woogle_members_admin(id, first_name, last_name, pledge_class_year, is_member, is_parent, city, state, address_line1, zip, personal_email, work_email, home_phone, mobile_phone, employer, job_title, linkedin_url, external_contact_id, created_at, updated_at)'

/** Always available to any logged-in viewer (no member-controlled PII). */
const ALWAYS_SCHEMA = [
  'woogle_exec_history(person_id, first_name, last_name, position, position_code, season, year, term_label, is_current)',
  'woogle_relationships(from_person_id, from_first_name, from_last_name, from_pledge_year, to_person_id, to_first_name, to_last_name, to_pledge_year, relationship_type)',
]

/**
 * Every additional domain view, tagged with the access level it requires. Adding
 * a row here (plus the matching CREATE VIEW migration) is all it takes to give
 * Woogle a new domain — the prompt schema and the SQL allowlist are both driven
 * from this single registry, so coverage and gating never drift apart.
 */
const DOMAIN_VIEWS: WoogleViewDef[] = [
  // --- Rush (rush chairs + admins) ------------------------------------------
  {
    name: 'woogle_rush_prospects',
    access: 'rush',
    schema:
      'woogle_rush_prospects(id, rush_year, first_name, last_name, email, phone, hometown, high_school, major, class_year, gpa, pipeline_stage, internal_rating, referral_source, legacy_relative_name, legacy_relationship, legacy_relative_person_id, assigned_to_person_id, assigned_to_name, application_submitted_at, created_at, updated_at, activity_count, last_activity_at, last_activity_type, last_contact_at, needs_response) — pipeline_stage is one of inquiry/screened/active/priority/bid_pending/bid_extended/bid_accepted/bid_declined/no_bid/withdrawn. last_contact_at is the most recent outreach (note/call/bid_*); NULL means never contacted. needs_response = true means the prospect is still open AND has never been contacted (use it for "candidates we haven\'t responded to").',
  },
  {
    name: 'woogle_rush_activities',
    access: 'rush',
    schema:
      'woogle_rush_activities(id, prospect_id, prospect_first_name, prospect_last_name, activity_type, note, from_stage, to_stage, rush_event_id, created_at) — append-only log of outreach/events per rush prospect; activity_type one of application_received/stage_change/note/event_attended/call_logged/bid_extended/bid_accepted/bid_declined.',
    join: 'woogle_rush_activities.prospect_id → woogle_rush_prospects.id; woogle_rush_activities.rush_event_id → woogle_rush_events.id.',
  },
  // --- Public / member content (any logged-in viewer) -----------------------
  {
    name: 'woogle_calendar_events',
    access: 'safe',
    schema:
      'woogle_calendar_events(id, name, description, start_date, end_date, start_time, end_time, all_day) — the chapter calendar.',
  },
  {
    name: 'woogle_rush_events',
    access: 'safe',
    schema:
      'woogle_rush_events(id, title, display_date, description, location, time_label, sort_order) — the public rush schedule (display_date is free text).',
  },
  {
    name: 'woogle_newsletters',
    access: 'safe',
    schema:
      'woogle_newsletters(id, season, year, created_at) — newsletter issues (metadata only; use search_knowledge for their contents).',
  },
  {
    name: 'woogle_house_mom',
    access: 'safe',
    schema:
      'woogle_house_mom(id, first_name, last_name, bio_html, has_photo) — the chapter house mother (single row).',
  },
  {
    name: 'woogle_history_images',
    access: 'safe',
    schema:
      'woogle_history_images(id, caption, alt_text, sort_order, uploaded_by) — captions for historical chapter photos.',
  },
  {
    name: 'woogle_resources',
    access: 'safe',
    schema:
      'woogle_resources(id, title, description, tag, uploaded_by, created_at) — member resource documents; tag one of legal/insurance/national/chapter_management/other.',
  },
  // --- Operational / sensitive (admins only) --------------------------------
  {
    name: 'woogle_email_campaigns',
    access: 'admin',
    schema:
      'woogle_email_campaigns(id, subject, audience_type, status, sent_at, recipient_count, created_at) — chapter email blasts; status draft/sent.',
  },
  {
    name: 'woogle_email_recipients',
    access: 'admin',
    schema:
      'woogle_email_recipients(id, campaign_id, person_id, first_name, last_name, email, status, delivered_at, opened_at, open_count, bounce_reason, last_event_at, created_at) — per-recipient delivery/open tracking; status sent/delivered/opened/bounced/dropped/spam.',
    join: 'woogle_email_recipients.campaign_id → woogle_email_campaigns.id.',
  },
  {
    name: 'woogle_person_enrichment',
    access: 'admin',
    schema:
      'woogle_person_enrichment(person_id, employer, job_title, industry, headline, linkedin_url_discovered, source, confidence, enriched_at) — cached third-party professional data per person.',
  },
  {
    name: 'woogle_guest_list',
    access: 'admin',
    schema: 'woogle_guest_list(id, name, active) — event guest-list names.',
  },
]

/** Keywords that must never appear in a Woogle query (defense-in-depth on top of the READ ONLY tx). */
const FORBIDDEN =
  /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|merge|call|do|vacuum|analyze|reindex|comment|set|reset|lock|into|nextval|setval|currval|dblink|pg_sleep|pg_read_file|pg_ls_dir|lo_import|lo_export)\b/i

const MAX_ROWS = 200
const STATEMENT_TIMEOUT_MS = 5000

export class SqlValidationError extends Error {}

/**
 * Executes LLM-generated SELECT queries against the privacy-masked `woogle_*`
 * views with multiple independent safety layers:
 *  1. Static validation: single SELECT/WITH statement, no comments, no DDL/DML
 *     keywords, and every referenced relation must be an allowlisted view (or a
 *     locally-defined CTE).
 *  2. A forced row LIMIT.
 *  3. Execution inside a READ ONLY transaction with a statement timeout, so even
 *     a validation gap cannot mutate data or hang the DB.
 */
@Injectable()
export class WoogleSqlService {
  constructor(
    private readonly sequelize: Sequelize,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(WoogleSqlService.name)
  }

  /** Access levels a viewer has, derived from their member tier + rush grant. */
  private accessSet(tier: SqlTier, includeRush: boolean): Set<AccessLevel> {
    const set = new Set<AccessLevel>(['safe'])
    if (includeRush || tier === 'admin') set.add('rush')
    if (tier === 'admin') set.add('admin')
    return set
  }

  /** Domain views the viewer is allowed to see, in registry order. */
  private availableDomainViews(tier: SqlTier, includeRush: boolean): WoogleViewDef[] {
    const access = this.accessSet(tier, includeRush)
    return DOMAIN_VIEWS.filter((v) => access.has(v.access))
  }

  /** The full set of view names the viewer may reference in SQL. */
  private allowedViewNames(tier: SqlTier, includeRush: boolean): Set<string> {
    const names = new Set<string>([
      tier === 'admin' ? 'woogle_members_admin' : 'woogle_members',
      'woogle_exec_history',
      'woogle_relationships',
    ])
    for (const v of this.availableDomainViews(tier, includeRush)) names.add(v.name)
    return names
  }

  /** Cross-view join hints + the canonical person-id rule, scoped to access. */
  private relationshipNotes(tier: SqlTier, includeRush: boolean): string {
    const memberView = tier === 'admin' ? 'woogle_members_admin' : 'woogle_members'
    const parts = [
      `${memberView}.id is the canonical person id; woogle_exec_history.person_id, woogle_relationships.from_person_id/to_person_id, and any *_person_id column reference it.`,
      ...this.availableDomainViews(tier, includeRush)
        .map((v) => v.join)
        .filter((j): j is string => !!j),
      "In woogle_relationships, relationship_type describes the FROM person relative to the TO person (e.g. type='parent' means from_* is the parent of to_*); links may be stored in either direction.",
    ]
    return `Joins: ${parts.join(' ')}`
  }

  /** Column reference (for prompting the model), scoped to the viewer's access. */
  schemaForTier(tier: SqlTier, includeRush = false): string {
    const lines = [
      tier === 'admin' ? MEMBER_SCHEMA_ADMIN : MEMBER_SCHEMA_SAFE,
      ...ALWAYS_SCHEMA,
      ...this.availableDomainViews(tier, includeRush).map((v) => v.schema),
      this.relationshipNotes(tier, includeRush),
    ]
    return lines.join('\n')
  }

  /**
   * Validate and normalize a query. Returns the final SQL (with a LIMIT applied)
   * or throws SqlValidationError with a message the agent can read and retry on.
   */
  validate(rawSql: string, tier: SqlTier, includeRush = false): string {
    if (typeof rawSql !== 'string' || !rawSql.trim()) {
      throw new SqlValidationError('Empty SQL.')
    }

    let sql = rawSql.trim()
    if (sql.endsWith(';')) sql = sql.slice(0, -1).trim()
    if (sql.includes(';')) {
      throw new SqlValidationError('Only a single statement is allowed (no semicolons).')
    }
    if (sql.includes('--') || sql.includes('/*')) {
      throw new SqlValidationError('SQL comments are not allowed.')
    }
    if (!/^(select|with)\b/i.test(sql)) {
      throw new SqlValidationError('Only SELECT / WITH (read-only) queries are allowed.')
    }
    const forbidden = sql.match(FORBIDDEN)
    if (forbidden) {
      throw new SqlValidationError(
        `Disallowed keyword: "${forbidden[1]}". This is a read-only tool.`,
      )
    }

    const allowed = this.allowedViewNames(tier, includeRush)

    // Collect locally-defined CTE names so `FROM <cte>` is permitted.
    const cteNames = new Set<string>()
    const cteRe = /(?:\bwith\b|,)\s*([a-z_][\w]*)\s+as\s*\(/gi
    let cm: RegExpExecArray | null
    while ((cm = cteRe.exec(sql))) cteNames.add(cm[1].toLowerCase())

    // Every relation after FROM/JOIN must be an allowlisted view or a CTE.
    const relRe = /\b(?:from|join)\s+([a-zA-Z_"][\w$."]*)/gi
    let rm: RegExpExecArray | null
    while ((rm = relRe.exec(sql))) {
      const ref = rm[1].replace(/"/g, '').toLowerCase()
      if (ref.includes('.')) {
        throw new SqlValidationError(`Schema-qualified access is not allowed: "${ref}".`)
      }
      if (!allowed.has(ref) && !cteNames.has(ref)) {
        throw new SqlValidationError(
          `Table "${ref}" is not available. Allowed views: ${[...allowed].join(', ')}.`,
        )
      }
    }

    if (!/\blimit\s+\d+/i.test(sql)) {
      sql += ` LIMIT ${MAX_ROWS}`
    }

    return sql
  }

  /**
   * Validate, then execute inside a READ ONLY transaction with a statement
   * timeout. Returns the (capped) rows plus the exact SQL that ran.
   */
  async run(
    rawSql: string,
    tier: SqlTier,
    includeRush = false,
  ): Promise<{ rows: Record<string, unknown>[]; sql: string }> {
    const sql = this.validate(rawSql, tier, includeRush)

    const rows = await this.sequelize.transaction(async (t) => {
      await this.sequelize.query('SET TRANSACTION READ ONLY', { transaction: t })
      await this.sequelize.query(`SET LOCAL statement_timeout = ${STATEMENT_TIMEOUT_MS}`, {
        transaction: t,
      })
      return this.sequelize.query<Record<string, unknown>>(sql, {
        type: QueryTypes.SELECT,
        transaction: t,
      })
    })

    this.logger.info('WoogleSql: query executed', { tier, rowCount: rows.length })
    return { rows: rows.slice(0, MAX_ROWS), sql }
  }
}
