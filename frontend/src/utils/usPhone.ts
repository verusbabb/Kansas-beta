/** Digits only (for search, etc.). */
export function usPhoneDigits(value: string | null | undefined): string {
  if (value == null || !String(value).trim()) return ''
  return String(value).replace(/\D/g, '')
}

/**
 * Show US numbers as ###-###-#### when 10 digits (after optional leading 1).
 * Otherwise returns trimmed original (non-US / odd formats).
 */
export function formatUsPhoneForDisplay(value: string | null | undefined): string {
  if (value == null || !String(value).trim()) return ''
  const trimmed = String(value).trim()
  let d = usPhoneDigits(trimmed)
  if (d.length === 11 && d.startsWith('1')) {
    d = d.slice(1)
  }
  if (d.length === 10) {
    return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  }
  return trimmed
}
