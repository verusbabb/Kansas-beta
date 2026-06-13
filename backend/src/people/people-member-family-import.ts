import { parse } from 'csv-parse/sync'
import { normalizeStateToCode } from './constants/us-states'
import { canonicalizeImportHeader } from './people-import'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ---------------------------------------------------------------------------
// Header → field mappings
// ---------------------------------------------------------------------------

const MEMBER_HEADER_TO_FIELD: Record<string, keyof NormalizedMemberRow> = {
  'first name': 'firstName',
  'last name': 'lastName',
  email: 'email',
  phone: 'phone',
  'street address': 'streetAddress',
  city: 'city',
  state: 'state',
  zip: 'zip',
  'pledge class year': 'pledgeClassYear',
  linkedin: 'linkedin',
  'linkedin profile': 'linkedin',
  'linkedin url': 'linkedin',
  'linkedin profile url': 'linkedin',
}

const MOM_HEADER_TO_FIELD: Record<string, keyof NormalizedParentRow> = {
  "mom's first name": 'firstName',
  "mom's last name": 'lastName',
  "mom's email": 'email',
  "mom's phone": 'phone',
  "mom's street address": 'streetAddress',
  "mom's city": 'city',
  "mom's state": 'state',
  "mom's zip": 'zip',
  'mom first name': 'firstName',
  'mom last name': 'lastName',
  'mom email': 'email',
  'mom phone': 'phone',
  'mom street address': 'streetAddress',
  'mom city': 'city',
  'mom state': 'state',
  'mom zip': 'zip',
}

const DAD_HEADER_TO_FIELD: Record<string, keyof NormalizedParentRow> = {
  "dad's first name": 'firstName',
  "dad's last name": 'lastName',
  "dad's email": 'email',
  "dad's phone": 'phone',
  "dad's street address": 'streetAddress',
  "dad's city": 'city',
  "dad's state": 'state',
  "dad's zip": 'zip',
  'dad first name': 'firstName',
  'dad last name': 'lastName',
  'dad email': 'email',
  'dad phone': 'phone',
  'dad street address': 'streetAddress',
  'dad city': 'city',
  'dad state': 'state',
  'dad zip': 'zip',
}

// ---------------------------------------------------------------------------
// Normalized row types (all strings, empty string = not provided)
// ---------------------------------------------------------------------------

interface NormalizedMemberRow {
  firstName: string
  lastName: string
  email: string
  phone: string
  streetAddress: string
  city: string
  state: string
  zip: string
  pledgeClassYear: string
  linkedin: string
}

interface NormalizedParentRow {
  firstName: string
  lastName: string
  email: string
  phone: string
  streetAddress: string
  city: string
  state: string
  zip: string
}

// ---------------------------------------------------------------------------
// Public payload types
// ---------------------------------------------------------------------------

export interface FamilyImportPersonPayload {
  firstName: string
  lastName: string
  email: string
  phone: string | null
  addressLine1: string | null
  city: string | null
  state: string | null
  zip: string | null
}

export interface FamilyImportMemberPayload extends FamilyImportPersonPayload {
  pledgeClassYear: number
  linkedinProfileUrl: string | null
}

export interface FamilyImportRowPayload {
  sourceRow: number
  member: FamilyImportMemberPayload
  mom: FamilyImportPersonPayload | null
  dad: FamilyImportPersonPayload | null
  /** Non-fatal warnings about parent rows (parent skipped but member kept). */
  parentWarnings: string[]
}

export interface FamilyImportSkip {
  sourceRow: number
  firstName: string
  lastName: string
  email: string
  reason: string
}

export interface FamilyImportParseResult {
  rows: FamilyImportRowPayload[]
  skips: FamilyImportSkip[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parsePledgeYear(s: string): number | 'invalid' | null {
  const t = s.trim()
  if (!t) return null
  const n = parseInt(t, 10)
  if (Number.isNaN(n) || n < 1900 || n > 2100) return 'invalid'
  return n
}

function normalizeRaw<F extends string>(
  raw: Record<string, string>,
  map: Record<string, F>,
  defaults: Record<F, string>,
): Record<F, string> {
  const out = { ...defaults }
  for (const [key, value] of Object.entries(raw)) {
    const field = map[canonicalizeImportHeader(key)]
    if (field !== undefined) {
      out[field] = value == null ? '' : String(value).trim()
    }
  }
  return out
}

const MEMBER_DEFAULTS: NormalizedMemberRow = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  streetAddress: '',
  city: '',
  state: '',
  zip: '',
  pledgeClassYear: '',
  linkedin: '',
}

const PARENT_DEFAULTS: NormalizedParentRow = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  streetAddress: '',
  city: '',
  state: '',
  zip: '',
}

function resolveState(raw: string): string | null | 'invalid' {
  const t = raw.trim()
  if (!t) return null
  const code = normalizeStateToCode(t)
  if (!code) return 'invalid'
  return code
}

function buildPersonPayload(n: NormalizedParentRow): FamilyImportPersonPayload | { error: string } {
  const stateResult = resolveState(n.state)
  if (stateResult === 'invalid') {
    return { error: `Unrecognized state "${n.state}" — use a US state name or 2-letter code` }
  }
  return {
    firstName: n.firstName,
    lastName: n.lastName,
    email: n.email.toLowerCase(),
    phone: n.phone || null,
    addressLine1: n.streetAddress || null,
    city: n.city || null,
    state: stateResult,
    zip: n.zip || null,
  }
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export function parseMemberFamilyImportBuffer(buf: Buffer): FamilyImportParseResult {
  const text = buf.toString('utf8').replace(/^\ufeff/, '')

  let records: Record<string, string>[]
  try {
    records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ',',
      trim: true,
      relax_column_count: true,
    }) as Record<string, string>[]
  } catch {
    return {
      rows: [],
      skips: [
        {
          sourceRow: 0,
          firstName: '',
          lastName: '',
          email: '',
          reason: 'File could not be parsed — ensure it is a valid CSV file',
        },
      ],
    }
  }

  const rows: FamilyImportRowPayload[] = []
  const skips: FamilyImportSkip[] = []
  const seenMemberEmail = new Set<string>()

  let sourceRow = 1

  for (const rec of records) {
    sourceRow += 1

    const m = normalizeRaw(rec, MEMBER_HEADER_TO_FIELD, MEMBER_DEFAULTS)
    const firstName = m.firstName.trim()
    const lastName = m.lastName.trim()
    const email = m.email.trim().toLowerCase()

    // Validate required member fields
    const missing: string[] = []
    if (!firstName) missing.push('First Name')
    if (!lastName) missing.push('Last Name')
    if (!email) missing.push('Email')

    if (missing.length > 0) {
      skips.push({
        sourceRow,
        firstName,
        lastName,
        email,
        reason: `Missing required member field(s): ${missing.join(', ')}`,
      })
      continue
    }

    if (!EMAIL_RE.test(email)) {
      skips.push({ sourceRow, firstName, lastName, email, reason: 'Invalid member email address' })
      continue
    }

    const yearResult = parsePledgeYear(m.pledgeClassYear)
    if (yearResult === null) {
      skips.push({
        sourceRow,
        firstName,
        lastName,
        email,
        reason: 'Pledge Class Year is required for all members',
      })
      continue
    }
    if (yearResult === 'invalid') {
      skips.push({
        sourceRow,
        firstName,
        lastName,
        email,
        reason: `Invalid Pledge Class Year "${m.pledgeClassYear}" — must be a year between 1900 and 2100`,
      })
      continue
    }

    const memberStateResult = resolveState(m.state)
    if (memberStateResult === 'invalid') {
      skips.push({
        sourceRow,
        firstName,
        lastName,
        email,
        reason: `Unrecognized member state "${m.state}" — use a US state name or 2-letter code`,
      })
      continue
    }

    if (seenMemberEmail.has(email)) {
      skips.push({
        sourceRow,
        firstName,
        lastName,
        email,
        reason: 'Duplicate member email in file — only the first occurrence is imported',
      })
      continue
    }
    seenMemberEmail.add(email)

    const memberPayload: FamilyImportMemberPayload = {
      firstName,
      lastName,
      email,
      phone: m.phone || null,
      addressLine1: m.streetAddress || null,
      city: m.city || null,
      state: memberStateResult,
      zip: m.zip || null,
      pledgeClassYear: yearResult,
      linkedinProfileUrl: m.linkedin || null,
    }

    const parentWarnings: string[] = []

    // Mom
    let mom: FamilyImportPersonPayload | null = null
    const momRaw = normalizeRaw(rec, MOM_HEADER_TO_FIELD, PARENT_DEFAULTS)
    const momHasAny = momRaw.firstName || momRaw.lastName || momRaw.email
    if (momHasAny) {
      const momMissing: string[] = []
      if (!momRaw.firstName) momMissing.push("Mom's First Name")
      if (!momRaw.lastName) momMissing.push("Mom's Last Name")
      if (!momRaw.email) momMissing.push("Mom's Email")
      if (momMissing.length > 0) {
        parentWarnings.push(`Mom skipped — missing: ${momMissing.join(', ')}`)
      } else if (!EMAIL_RE.test(momRaw.email.toLowerCase())) {
        parentWarnings.push(`Mom skipped — invalid email address "${momRaw.email}"`)
      } else {
        const result = buildPersonPayload(momRaw)
        if ('error' in result) {
          parentWarnings.push(`Mom skipped — ${result.error}`)
        } else {
          mom = result
        }
      }
    }

    // Dad
    let dad: FamilyImportPersonPayload | null = null
    const dadRaw = normalizeRaw(rec, DAD_HEADER_TO_FIELD, PARENT_DEFAULTS)
    const dadHasAny = dadRaw.firstName || dadRaw.lastName || dadRaw.email
    if (dadHasAny) {
      const dadMissing: string[] = []
      if (!dadRaw.firstName) dadMissing.push("Dad's First Name")
      if (!dadRaw.lastName) dadMissing.push("Dad's Last Name")
      if (!dadRaw.email) dadMissing.push("Dad's Email")
      if (dadMissing.length > 0) {
        parentWarnings.push(`Dad skipped — missing: ${dadMissing.join(', ')}`)
      } else if (!EMAIL_RE.test(dadRaw.email.toLowerCase())) {
        parentWarnings.push(`Dad skipped — invalid email address "${dadRaw.email}"`)
      } else {
        const result = buildPersonPayload(dadRaw)
        if ('error' in result) {
          parentWarnings.push(`Dad skipped — ${result.error}`)
        } else {
          dad = result
        }
      }
    }

    rows.push({ sourceRow, member: memberPayload, mom, dad, parentWarnings })
  }

  return { rows, skips }
}
