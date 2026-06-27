/**
 * Single source of truth for app role copy (labels, summaries, and capability
 * descriptions) shown across the admin UI: the Manage Users role reference, the
 * change-role dialog, and the invite flow.
 *
 * This documents existing behavior only — it does not define or enforce
 * permissions. The authoritative rules live in the backend guards (@Roles /
 * RolesGuard) and the router/route guards.
 */
import { UserRole } from '@/types/user'

export interface RoleInfo {
  value: UserRole
  /** Short label for selects and badges, e.g. "Editor". */
  label: string
  /** One-line summary shown inline next to a role selector. */
  summary: string
  /** Plain-English capabilities, suitable for a bullet list. */
  can: string[]
  /** Notable things this role explicitly cannot do (omit for admin). */
  cannot?: string[]
}

export const ROLE_INFO: Record<UserRole, RoleInfo> = {
  [UserRole.VIEWER]: {
    value: UserRole.VIEWER,
    label: 'Viewer',
    summary: 'Standard member — browse the directory, manage their own profile, and use Woogle. No admin access.',
    can: [
      "See members' shared contact info in the directory once signed in",
      'Edit their own profile, photo, and family relationships',
      'Claim and manage their own exec position (if a member)',
      'Use the Woogle AI tool',
    ],
    cannot: ['Open the Admin panel or any management tools'],
  },
  [UserRole.MEMBER]: {
    value: UserRole.MEMBER,
    label: 'Member',
    summary: 'Everything a Viewer can do, plus log notes on rush candidates and manage shared Resources.',
    can: [
      'Everything a Viewer can do',
      'Open the Rush CRM to view candidates and their details',
      'Log notes, calls, and activities on rush candidates',
      'Upload, edit, replace, and download Resources',
    ],
    cannot: [
      'Edit candidate details, change pipeline stage, assign chairs, or rate candidates',
      'Delete rush candidates or Resources',
      'Open any other Admin section or management tools',
    ],
  },
  [UserRole.RUSH_CHAIR]: {
    value: UserRole.RUSH_CHAIR,
    label: 'Rush Chair',
    summary: 'Everything a Member can do, plus full control of the Rush CRM (edit, assign, rate, delete candidates).',
    can: [
      'Everything a Member can do',
      'Edit candidate details and move them through the pipeline stages',
      'Assign rush chairs and rate candidates',
      'Delete rush candidates',
    ],
    cannot: [
      'Delete Resources',
      'Open any other Admin section or management tools',
    ],
  },
  [UserRole.EDITOR]: {
    value: UserRole.EDITOR,
    label: 'Editor',
    summary: 'Manage site content, rush, email, Exec Team, and House Mom — but not accounts or the member directory.',
    can: [
      'Create and edit calendar events',
      'Manage home page, history, and rush photos',
      'Create and manage newsletters',
      'Manage the Rush page and rush events',
      'Use the full Rush CRM: view and update applicants and log activities',
      'Manage Exec Team terms and rosters',
      'Manage the House Mom profile and photo',
      'Compose and send Email Campaigns and view their tracking',
      'Upload, edit, and download Resources',
      'Use the Woogle AI tool',
    ],
    cannot: [
      'Manage users or change roles',
      'Add, edit, delete, import, or export directory people',
      'Delete Resources or rush applicants',
      'Re-index the Woogle knowledge base',
    ],
  },
  [UserRole.ADMIN]: {
    value: UserRole.ADMIN,
    label: 'Admin',
    summary: 'Full access, including user management, the full member directory, and deletions.',
    can: [
      'Everything an Editor can do',
      'Manage users and roles: invite, bulk invite, resend invites, and remove accounts',
      'Access the full member directory, including all contact info',
      'Add, edit, and delete people; bulk import (CSV / Pennington); export CSV',
      'Manage Exec Team terms and rosters',
      'Manage House Mom',
      'Delete Resources and rush applicants',
      'Re-index the Woogle knowledge base',
    ],
  },
}

/** What people without an account (or signed out) can see. */
export const PUBLIC_ACCESS_SUMMARY =
  'Public (no account): Browse public pages (Home, Rush, Apply, Newsletters, Events, History, Donate, Contact) and view the member directory and profiles with contact details hidden. Can submit a rush application.'

/** Ordered list (least → most access) for rendering the reference. */
export const ROLE_ORDER: UserRole[] = [
  UserRole.VIEWER,
  UserRole.MEMBER,
  UserRole.RUSH_CHAIR,
  UserRole.EDITOR,
  UserRole.ADMIN,
]

/** Sensitivity note to surface when granting Admin. */
export const ADMIN_CAUTION =
  'Admin grants sensitive powers: managing accounts, full member contact data and exports, and deletions. Grant it only to people who help run the chapter.'

/** Options for a role <Select> (no descriptions — pairs with an inline summary). */
export const ROLE_OPTIONS = ROLE_ORDER.map((value) => ({
  label: ROLE_INFO[value].label,
  value,
}))

/** Options for a role <Select> with the summary appended to each label. */
export const ROLE_OPTIONS_WITH_SUMMARY = ROLE_ORDER.map((value) => ({
  label: `${ROLE_INFO[value].label} — ${ROLE_INFO[value].summary}`,
  value,
}))

/** Options for a role filter, including an "All roles" entry. */
export const ROLE_FILTER_OPTIONS = [
  { label: 'All roles', value: null },
  ...ROLE_OPTIONS,
]
