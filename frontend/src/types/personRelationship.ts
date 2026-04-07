/** Matches backend `PersonRelationshipConnectDirectionDto` */
export type PersonRelationshipDirection = 'other_is_from' | 'other_is_to'

export type PersonConnectionTag = 'legacy' | 'family'

export interface PersonRelationshipCounterpart {
  id: string
  firstName: string
  lastName: string
  email?: string | null
  hasEmailOnFile?: boolean
  isMember: boolean
  isParent: boolean
  removedFromDirectory: boolean
  pledgeClassYear?: number | null
}

export interface PersonRelationshipResponse {
  id: string
  fromPersonId: string
  toPersonId: string
  counterpart: PersonRelationshipCounterpart
  relationshipType: string | null
  notes: string | null
  viewerIsFrom: boolean
  viewerCounterpartRoleLabel: string
  connectionTags: PersonConnectionTag[]
  createdAt: string
  updatedAt: string
}

export interface CreatePersonRelationshipPayload {
  otherPersonId: string
  direction: PersonRelationshipDirection
  relationshipType?: string | null
  notes?: string
}

export interface UpdatePersonRelationshipPayload {
  relationshipType?: string | null
  notes?: string | null
}
