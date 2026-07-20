export type PipelineStage =
  | 'inquiry'
  | 'screened'
  | 'active'
  | 'priority'
  | 'bid_pending'
  | 'bid_extended'
  | 'bid_accepted'
  | 'bid_declined'
  | 'no_bid'
  | 'withdrawn'

export type ClassYear = 'freshman' | 'sophomore' | 'junior' | 'senior' | 'other'
export type EnrollmentSemester = 'fall' | 'spring'
export type LegacyRelationship =
  | 'father'
  | 'grandfather'
  | 'great_grandfather'
  | 'uncle'
  | 'brother'
  | 'cousin'

export type ActivityType =
  | 'application_received'
  | 'stage_change'
  | 'note'
  | 'event_attended'
  | 'call_logged'
  | 'bid_extended'
  | 'bid_accepted'
  | 'bid_declined'

// ── API payloads ──────────────────────────────────────────────────────────────

export interface CreateRushProspectPayload {
  firstName: string
  lastName: string
  email: string
  phone: string
  classYear: ClassYear
  hometown?: string
  highSchool?: string
  enrollmentSemester?: EnrollmentSemester
  enrollmentYear?: number
  major?: string
  gpa?: number
  actScore?: number
  satScore?: number
  sportsActivities?: string
  honorsAwards?: string
  legacyRelativePersonId?: string
  legacyRelativeName?: string
  legacyRelationship?: LegacyRelationship
  referralSource?: string
}

export interface UpdateRushProspectPayload {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  classYear?: ClassYear
  hometown?: string
  highSchool?: string
  enrollmentSemester?: EnrollmentSemester | null
  enrollmentYear?: number | null
  major?: string
  gpa?: number | null
  actScore?: number | null
  satScore?: number | null
  sportsActivities?: string
  honorsAwards?: string
  legacyRelativePersonId?: string | null
  legacyRelativeName?: string | null
  legacyRelationship?: LegacyRelationship | null
  referralSource?: string
  pipelineStage?: PipelineStage
  assignedToPersonId?: string | null
  internalRating?: number | null
}

export interface CreateActivityPayload {
  activityType: 'note' | 'event_attended' | 'call_logged'
  note?: string
  rushEventId?: string
}

// ── API responses ─────────────────────────────────────────────────────────────

export interface MemberLegacySearchResult {
  id: string
  firstName: string
  lastName: string
}

export interface RushProspectActivity {
  id: string
  prospectId: string
  activityType: ActivityType
  note: string | null
  fromStage: string | null
  toStage: string | null
  rushEventId: string | null
  rushEventTitle: string | null
  createdByUserId: string | null
  createdByName: string | null
  createdAt: string
}

export interface RushProspectSummary {
  id: string
  rushYear: number
  firstName: string
  lastName: string
  email: string
  phone: string | null
  hometown: string | null
  classYear: ClassYear | null
  enrollmentSemester: EnrollmentSemester | null
  enrollmentYear: number | null
  isLegacy: boolean
  pipelineStage: PipelineStage
  internalRating: number | null
  assignedToPersonId: string | null
  assignedToPersonName: string | null
  applicationSubmittedAt: string | null
  lastStageChangedAt: string | null
  createdAt: string
}

export interface RushProspectResponse extends RushProspectSummary {
  hometown: string | null
  highSchool: string | null
  major: string | null
  gpa: number | null
  actScore: number | null
  satScore: number | null
  sportsActivities: string | null
  honorsAwards: string | null
  legacyRelativePersonId: string | null
  legacyRelativeName: string | null
  legacyRelationship: LegacyRelationship | null
  legacyRelativeFullName: string | null
  referralSource: string | null
  activities: RushProspectActivity[]
}

// ── UI helpers ────────────────────────────────────────────────────────────────

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  inquiry: 'Inquiry',
  screened: 'Screened',
  active: 'Active',
  priority: 'Priority',
  bid_pending: 'Bid Pending',
  bid_extended: 'Bid Extended',
  bid_accepted: 'Bid Accepted',
  bid_declined: 'Bid Declined',
  no_bid: 'No Bid',
  withdrawn: 'Withdrawn',
}

export const PIPELINE_STAGE_SEVERITY: Record<PipelineStage, string> = {
  inquiry: 'secondary',
  screened: 'info',
  active: 'info',
  priority: 'warn',
  bid_pending: 'warn',
  bid_extended: 'contrast',
  bid_accepted: 'success',
  bid_declined: 'danger',
  no_bid: 'danger',
  withdrawn: 'secondary',
}

export const CLASS_YEAR_LABELS: Record<ClassYear, string> = {
  freshman: 'Freshman',
  sophomore: 'Sophomore',
  junior: 'Junior',
  senior: 'Senior',
  other: 'Other',
}

export const LEGACY_RELATIONSHIP_LABELS: Record<LegacyRelationship, string> = {
  father: 'Father',
  grandfather: 'Grandfather',
  great_grandfather: 'Great-grandfather',
  uncle: 'Uncle',
  brother: 'Brother',
  cousin: 'Cousin',
}

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  application_received: 'Application Received',
  stage_change: 'Stage Changed',
  note: 'General Note',
  event_attended: 'Event Note',
  call_logged: 'Call Note',
  bid_extended: 'Bid Extended',
  bid_accepted: 'Bid Accepted',
  bid_declined: 'Bid Declined',
}

export const ACTIVITY_TYPE_ICONS: Record<ActivityType, string> = {
  application_received: 'pi pi-file',
  stage_change: 'pi pi-arrow-right',
  note: 'pi pi-comment',
  event_attended: 'pi pi-star',
  call_logged: 'pi pi-phone',
  bid_extended: 'pi pi-send',
  bid_accepted: 'pi pi-check-circle',
  bid_declined: 'pi pi-times-circle',
}

export const PIPELINE_STAGE_DESCRIPTIONS: Record<PipelineStage, string> = {
  inquiry: 'Applied or signed up — not yet reviewed by the rush team.',
  screened: 'Rush team has reviewed the application and determined the candidate is worth pursuing.',
  active: 'Candidate is attending events or actively engaged in the rush process.',
  priority: 'High-priority candidate — the chapter strongly wants to extend a bid.',
  bid_pending: 'Under formal chapter consideration; a vote or decision is in progress.',
  bid_extended: 'A bid has been formally offered to the candidate.',
  bid_accepted: 'Candidate accepted the bid and will become a pledge.',
  bid_declined: 'Candidate received a bid but chose not to accept.',
  no_bid: 'The chapter decided not to extend a bid to this candidate.',
  withdrawn: 'Candidate withdrew from the process at any stage.',
}

export interface RushChair {
  id: string
  firstName: string
  lastName: string
  termLabel: string
  isCurrent: boolean
}

export const ALL_PIPELINE_STAGES: PipelineStage[] = [
  'inquiry',
  'screened',
  'active',
  'priority',
  'bid_pending',
  'bid_extended',
  'bid_accepted',
  'bid_declined',
  'no_bid',
  'withdrawn',
]
