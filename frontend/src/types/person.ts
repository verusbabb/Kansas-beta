/** Matches backend `PersonKindDto` */
export type PersonKind = 'member' | 'parent' | 'both'

export interface CreatePersonPayload {
  kind: PersonKind
  firstName: string
  lastName: string
  addressLine1: string
  city: string
  state: string
  zip: string
  email: string
  phone?: string
  pledgeClassYear?: number
}

/** Partial body for PATCH /people/:id */
export interface UpdatePersonPayload {
  kind?: PersonKind
  firstName?: string
  lastName?: string
  addressLine1?: string
  city?: string
  state?: string
  zip?: string
  email?: string
  phone?: string | null
  pledgeClassYear?: number | null
}

export interface PersonResponse {
  id: string
  firstName: string
  lastName: string
  addressLine1: string
  city: string
  state: string
  zip: string
  email: string
  phone?: string | null
  pledgeClassYear?: number | null
  isMember: boolean
  isParent: boolean
  /** At least one member↔member relationship (both sides chapter members), not parent-only family links. */
  hasLegacyMemberLink: boolean
  /** True when a headshot is stored (exec team / display). */
  hasHeadshot?: boolean
  createdAt: string
  updatedAt: string
}
