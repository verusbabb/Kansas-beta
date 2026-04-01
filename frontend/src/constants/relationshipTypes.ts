/**
 * Labels for relationship type codes (keep values in sync with backend
 * `person-relationships/constants/relationship-types.ts`).
 */
export const PERSON_RELATIONSHIP_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'parent', label: 'Parent' },
  { value: 'son', label: 'Son' },
  { value: 'brother', label: 'Brother' },
  { value: 'cousin', label: 'Cousin' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'great_grandparent', label: 'Great-grandparent' },
  { value: 'great_great_grandparent', label: 'Great-great-grandparent' },
  { value: 'grandchild', label: 'Grandchild' },
  { value: 'great_grandchild', label: 'Great-grandchild' },
  { value: 'great_great_grandchild', label: 'Great-great-grandchild' },
  { value: 'uncle', label: 'Uncle' },
  { value: 'nephew', label: 'Nephew' },
].sort((a, b) => a.label.localeCompare(b.label))

const labelByValue = Object.fromEntries(
  PERSON_RELATIONSHIP_TYPE_OPTIONS.map((o) => [o.value, o.label]),
)

export function relationshipTypeLabel(code: string | null | undefined): string | null {
  if (code == null || code === '') return null
  return labelByValue[code] ?? code.replace(/_/g, ' ')
}
