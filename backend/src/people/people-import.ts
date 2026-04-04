import { parse } from 'csv-parse/sync'
import { normalizeStateToCode } from './constants/us-states'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Normalize spreadsheet header for alias lookup. */
export function canonicalizeImportHeader(h: string): string {
  return h
    .replace(/^\ufeff/, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

const HEADER_TO_FIELD: Record<string, keyof NormalizedImportRow> = {
  'first name': 'firstName',
  'last name': 'lastName',
  'preferred year': 'preferredYear',
  'constituent code': 'constituentCode',
  'mailing street': 'mailingStreet',
  'mailing city': 'mailingCity',
  'mailing state/province': 'mailingState',
  'mailing zip/postal code': 'mailingZip',
  'home phone': 'homePhone',
  mobile: 'mobilePhone',
  'mobile phone': 'mobilePhone',
  email: 'email',
  'contact id': 'externalContactId',
}

export interface NormalizedImportRow {
  externalContactId: string
  firstName: string
  lastName: string
  preferredYear: string
  constituentCode: string
  mailingStreet: string
  mailingCity: string
  mailingState: string
  mailingZip: string
  homePhone: string
  mobilePhone: string
  email: string
}

export interface PeopleImportCreatePayload {
  sourceRow: number
  /** Original parsed row for skipped export if insert is skipped later. */
  raw: Record<string, string>
  /** CRM contact id (trimmed); required for import upsert. */
  externalContactId: string
  firstName: string
  lastName: string
  email: string
  addressLine1: string | null
  city: string | null
  state: string | null
  zip: string | null
  homePhone: string | null
  mobilePhone: string | null
  pledgeClassYear: number | null
  isMember: boolean
  isParent: boolean
}

export interface PeopleImportSkip {
  sourceRow: number
  /** Original column → value from file (stringified). */
  raw: Record<string, string>
  reason: string
}

export interface PeopleImportParseResult {
  creates: PeopleImportCreatePayload[]
  skips: PeopleImportSkip[]
  /** Delimiter to use when building skipped-rows file (match input). */
  outputDelimiter: string
}

/** Take substring before ` and ` or ` & ` (case-insensitive). */
export function splitAddresseeFirstName(raw: string): string {
  const t = raw.trim()
  if (!t) return t
  const re = /\s+(?:and|&)\s+/i
  const m = t.match(re)
  if (m?.index != null) return t.slice(0, m.index).trim()
  return t
}

function detectDelimiter(firstLine: string): '\t' | ',' {
  const tabs = (firstLine.match(/\t/g) || []).length
  const commas = (firstLine.match(/,/g) || []).length
  return tabs >= commas ? '\t' : ','
}

function normalizeRow(raw: Record<string, string>): NormalizedImportRow {
  const out: Partial<NormalizedImportRow> = {}
  for (const [key, value] of Object.entries(raw)) {
    const field = HEADER_TO_FIELD[canonicalizeImportHeader(key)]
    if (field) {
      out[field] = value == null ? '' : String(value).trim()
    }
  }
  return {
    externalContactId: out.externalContactId ?? '',
    firstName: out.firstName ?? '',
    lastName: out.lastName ?? '',
    preferredYear: out.preferredYear ?? '',
    constituentCode: out.constituentCode ?? '',
    mailingStreet: out.mailingStreet ?? '',
    mailingCity: out.mailingCity ?? '',
    mailingState: out.mailingState ?? '',
    mailingZip: out.mailingZip ?? '',
    homePhone: out.homePhone ?? '',
    mobilePhone: out.mobilePhone ?? '',
    email: out.email ?? '',
  }
}

function rawRowToStringRecord(raw: Record<string, unknown>): Record<string, string> {
  const o: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) {
    o[k] = v == null ? '' : String(v)
  }
  return o
}

type ConstituentKind = 'member' | 'parent'

function parseConstituent(code: string): ConstituentKind | null {
  const c = code.trim().toLowerCase()
  if (c === 'alumni' || c === 'undergrad' || c === 'undergraduate') return 'member'
  if (c === 'parent') return 'parent'
  return null
}

function parsePledgeYear(s: string): number | null {
  const t = s.trim()
  if (!t) return null
  const n = parseInt(t, 10)
  if (Number.isNaN(n) || n < 1900 || n > 2100) return null
  return n
}

export function parsePeopleImportBuffer(buf: Buffer): PeopleImportParseResult {
  const text = buf.toString('utf8').replace(/^\ufeff/, '')
  const lines = text.split(/\r?\n/)
  const firstNonEmpty = lines.find((l) => l.trim().length > 0) ?? ''
  const delimiter = detectDelimiter(firstNonEmpty)

  let records: Record<string, string>[]
  try {
    records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      delimiter,
      trim: true,
      relax_column_count: true,
    }) as Record<string, string>[]
  } catch {
    return {
      creates: [],
      skips: [
        {
          sourceRow: 0,
          raw: {},
          reason: 'parse_error',
        },
      ],
      outputDelimiter: delimiter,
    }
  }

  const creates: PeopleImportCreatePayload[] = []
  const skips: PeopleImportSkip[] = []
  const seenEmailInFile = new Set<string>()
  const seenContactIdInFile = new Set<string>()

  let sourceRow = 1

  for (const rec of records) {
    sourceRow += 1
    const raw = rawRowToStringRecord(rec)
    const n = normalizeRow(raw)

    const externalContactId = n.externalContactId.trim()
    if (!externalContactId) {
      skips.push({ sourceRow, raw, reason: 'missing_external_contact_id' })
      continue
    }
    if (seenContactIdInFile.has(externalContactId)) {
      skips.push({ sourceRow, raw, reason: 'duplicate_contact_id_in_file' })
      continue
    }
    seenContactIdInFile.add(externalContactId)

    const firstName = splitAddresseeFirstName(n.firstName)
    const lastName = n.lastName.trim()
    const email = n.email.trim().toLowerCase()
    const street = n.mailingStreet.trim()
    const city = n.mailingCity.trim()
    const zip = n.mailingZip.trim()
    const stateRaw = n.mailingState.trim()
    const stateCode = stateRaw ? normalizeStateToCode(n.mailingState) : null

    const missing: string[] = []
    if (!firstName) missing.push('first_name')
    if (!lastName) missing.push('last_name')
    if (!email) missing.push('email')
    if (stateRaw && !stateCode) missing.push('invalid_state')

    if (missing.length > 0) {
      skips.push({
        sourceRow,
        raw,
        reason: `missing_or_invalid:${missing.join(',')}`,
      })
      continue
    }

    if (!EMAIL_RE.test(email)) {
      skips.push({ sourceRow, raw, reason: 'invalid_email' })
      continue
    }

    const constituent = parseConstituent(n.constituentCode)
    if (!constituent) {
      skips.push({ sourceRow, raw, reason: 'unknown_constituent_code' })
      continue
    }

    let isMember = false
    let isParent = false
    let pledgeClassYear: number | null = null

    if (constituent === 'member') {
      isMember = true
      isParent = false
      const y = parsePledgeYear(n.preferredYear)
      if (y == null) {
        skips.push({ sourceRow, raw, reason: 'missing_pledge_class_year' })
        continue
      }
      pledgeClassYear = y
    } else {
      isParent = true
      isMember = false
      pledgeClassYear = null
    }

    if (seenEmailInFile.has(email)) {
      skips.push({ sourceRow, raw, reason: 'duplicate_email_in_file' })
      continue
    }
    seenEmailInFile.add(email)

    creates.push({
      sourceRow,
      raw,
      externalContactId,
      firstName,
      lastName,
      email,
      addressLine1: street || null,
      city: city || null,
      state: stateCode,
      zip: zip || null,
      homePhone: n.homePhone.trim() || null,
      mobilePhone: n.mobilePhone.trim() || null,
      pledgeClassYear,
      isMember,
      isParent,
    })
  }

  return { creates, skips, outputDelimiter: delimiter }
}

/** Build CSV/TSV text for skipped rows (original columns + source_row + skip_reason). */
export function formatSkippedImportRows(
  skips: PeopleImportSkip[],
  delimiter: string,
): string {
  if (skips.length === 0) return ''

  const keySet = new Set<string>()
  for (const s of skips) {
    for (const k of Object.keys(s.raw)) keySet.add(k)
  }
  const keys = [...keySet].sort()
  const headers = [...keys, 'source_row', 'skip_reason']

  const esc = (v: string) => {
    if (v.includes('"') || v.includes('\n') || v.includes('\r') || v.includes(delimiter)) {
      return `"${v.replace(/"/g, '""')}"`
    }
    return v
  }

  const lines = [headers.map(esc).join(delimiter)]
  for (const s of skips) {
    const cells = keys.map((k) => esc(s.raw[k] ?? ''))
    cells.push(esc(String(s.sourceRow)), esc(s.reason))
    lines.push(cells.join(delimiter))
  }
  return '\uFEFF' + lines.join('\n') + '\n'
}
