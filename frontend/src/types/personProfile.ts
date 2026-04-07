import type { PersonResponse } from '@/types/person'
import type { PersonRelationshipResponse } from '@/types/personRelationship'
import type { ExecPositionPublic, ExecTermPublic } from '@/types/execTeam'

export interface PersonExecHistoryEntry {
  term: ExecTermPublic
  position: ExecPositionPublic
}

/** Matches backend `PersonProfileResponseDto` */
export interface PersonProfileResponse {
  person: PersonResponse
  /** Signed URL for directory/profile photo when present. */
  headshotUrl?: string | null
  /** Signed URL for exec roster photo when present. */
  execRosterHeadshotUrl?: string | null
  relationships: PersonRelationshipResponse[]
  execHistory: PersonExecHistoryEntry[]
}
