/** Matches backend `PersonKindDto` */
export type PersonKind = 'member' | 'parent' | 'both'

export interface CreatePersonPayload {
  kind: PersonKind
  firstName: string
  lastName: string
  /** Any subset of mailing address fields may be omitted or empty. */
  addressLine1?: string
  city?: string
  state?: string
  zip?: string
  email: string
  externalContactId?: string
  /** Public LinkedIn profile URL (https://…) */
  linkedinProfileUrl?: string
  homePhone?: string
  mobilePhone?: string
  pledgeClassYear?: number
}

/** Partial body for PATCH /people/:id */
export interface UpdatePersonPayload {
  kind?: PersonKind
  firstName?: string
  lastName?: string
  addressLine1?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  email?: string
  externalContactId?: string | null
  linkedinProfileUrl?: string | null
  homePhone?: string | null
  mobilePhone?: string | null
  pledgeClassYear?: number | null
  shareEmailWithLoggedInMembers?: boolean
  sharePhonesWithLoggedInMembers?: boolean
  shareAddressWithLoggedInMembers?: boolean
  shareLinkedInWithLoggedInMembers?: boolean
}

export interface PersonResponse {
  id: string
  firstName: string
  lastName: string
  addressLine1?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  /** Null when redacted (guests or member opted out). */
  email?: string | null
  /** True when an email exists in the directory; use with `email: null` for redacted UI. */
  hasEmailOnFile?: boolean
  externalContactId?: string | null
  linkedinProfileUrl?: string | null
  /** True when a URL exists; use with `linkedinProfileUrl: null` for redacted UI. */
  hasLinkedInOnFile?: boolean
  /** True when any address line is stored; use when address fields are null. */
  hasAddressOnFile?: boolean
  homePhone?: string | null
  mobilePhone?: string | null
  /** True when a home number exists; may be true while `homePhone` is null for privacy. */
  hasHomePhone?: boolean
  /** True when a mobile number exists; may be true while `mobilePhone` is null for privacy. */
  hasMobilePhone?: boolean
  pledgeClassYear?: number | null
  isMember: boolean
  isParent: boolean
  /** At least one member↔member relationship (both sides chapter members), not parent-only family links. */
  hasLegacyMemberLink: boolean
  /** Directory / profile photo (current). */
  hasProfileHeadshot?: boolean
  /** Executive roster (era) photo. */
  hasExecRosterHeadshot?: boolean
  shareEmailWithLoggedInMembers?: boolean
  sharePhonesWithLoggedInMembers?: boolean
  shareAddressWithLoggedInMembers?: boolean
  shareLinkedInWithLoggedInMembers?: boolean
  createdAt: string
  updatedAt: string
}

/** POST /people/import */
export interface PeopleBulkImportResponse {
  importedCount: number
  skippedCount: number
  skippedFileContent: string
  /** Present when skippedCount > 0; use for download filename (.csv vs .tsv). */
  skippedFileFormat?: 'csv' | 'tsv'
}
