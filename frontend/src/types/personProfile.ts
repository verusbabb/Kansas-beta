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
  /** Signed GCS URL when a headshot exists (e.g. exec uploads); short-lived. */
  headshotUrl?: string | null
  relationships: PersonRelationshipResponse[]
  execHistory: PersonExecHistoryEntry[]
}
