export interface ExecPositionPublic {
  id: string
  code: string
  displayName: string
  sortOrder: number
}

export interface ExecTermPublic {
  id: string
  year: number
  season: 'fall' | 'spring'
  label?: string | null
  isCurrent: boolean
}

export interface ExecRosterPerson {
  id: string
  firstName: string
  lastName: string
  /** Set only for the chapter’s current term. */
  email?: string | null
  phone?: string | null
  headshotUrl?: string | null
}

export interface ExecRosterSlot {
  position: ExecPositionPublic
  person?: ExecRosterPerson | null
}

export interface ExecRosterResponse {
  term: ExecTermPublic | null
  slots: ExecRosterSlot[]
}

export interface CreateExecTermPayload {
  year: number
  season: 'fall' | 'spring'
  label?: string
  isCurrent?: boolean
}

export interface UpdateExecTermPayload {
  label?: string | null
  isCurrent?: boolean
}

export interface ReplaceExecRosterPayload {
  assignments: { positionId: string; personId?: string | null }[]
}
