/** Matches backend `PersonRelationshipConnectDirectionDto` */
export type PersonRelationshipDirection = 'other_is_from' | 'other_is_to'

export interface PersonRelationshipCounterpart {
  id: string
  firstName: string
  lastName: string
  email: string
  isMember: boolean
  isParent: boolean
  removedFromDirectory: boolean
}

export interface PersonRelationshipResponse {
  id: string
  fromPersonId: string
  toPersonId: string
  counterpart: PersonRelationshipCounterpart
  relationshipType: string | null
  notes: string | null
  viewerIsFrom: boolean
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
