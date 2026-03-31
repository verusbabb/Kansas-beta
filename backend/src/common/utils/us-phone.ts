/**
 * US phone: strip non-digits, optional leading 1 → store as ###-###-####.
 * Other shapes stay trimmed (international / extensions) so we do not lose data.
 */
export function normalizeUsPhoneForStorage(input: string | null | undefined): string | null {
  if (input == null) return null
  const trimmed = String(input).trim()
  if (!trimmed) return null

  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    const core = digits.slice(1)
    if (core.length === 10) {
      return `${core.slice(0, 3)}-${core.slice(3, 6)}-${core.slice(6)}`
    }
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  return trimmed
}
