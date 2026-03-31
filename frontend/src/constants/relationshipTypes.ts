/**
 * Labels for relationship type codes (keep values in sync with backend
 * `person-relationships/constants/relationship-types.ts`).
 */
export const PERSON_RELATIONSHIP_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'son', label: 'Son' },
  { value: 'daughter', label: 'Daughter' },
  { value: 'child', label: 'Child' },
  { value: 'father', label: 'Father' },
  { value: 'mother', label: 'Mother' },
  { value: 'parent', label: 'Parent' },
  { value: 'brother', label: 'Brother' },
  { value: 'sister', label: 'Sister' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'grandfather', label: 'Grandfather' },
  { value: 'grandmother', label: 'Grandmother' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'grandson', label: 'Grandson' },
  { value: 'granddaughter', label: 'Granddaughter' },
  { value: 'grandchild', label: 'Grandchild' },
  { value: 'great_grandfather', label: 'Great-grandfather' },
  { value: 'great_grandmother', label: 'Great-grandmother' },
  { value: 'great_grandparent', label: 'Great-grandparent' },
  { value: 'great_grandson', label: 'Great-grandson' },
  { value: 'great_granddaughter', label: 'Great-granddaughter' },
  { value: 'great_grandchild', label: 'Great-grandchild' },
  { value: 'uncle', label: 'Uncle' },
  { value: 'aunt', label: 'Aunt' },
  { value: 'nephew', label: 'Nephew' },
  { value: 'niece', label: 'Niece' },
  { value: 'cousin', label: 'Cousin' },
].sort((a, b) => a.label.localeCompare(b.label))

const labelByValue = Object.fromEntries(
  PERSON_RELATIONSHIP_TYPE_OPTIONS.map((o) => [o.value, o.label]),
)

export function relationshipTypeLabel(code: string | null | undefined): string | null {
  if (code == null || code === '') return null
  return labelByValue[code] ?? code.replace(/_/g, ' ')
}
