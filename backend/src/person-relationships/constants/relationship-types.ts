/**
 * Directed edge semantics: `from` is the `relationshipType` of `to`
 * (e.g. from=Bob, to=Sam, type=uncle → Bob is Sam’s uncle).
 * Nullable type = linked, relationship not yet specified.
 */
export const PERSON_RELATIONSHIP_TYPES = [
  'son',
  'daughter',
  'child',
  'father',
  'mother',
  'parent',
  'brother',
  'sister',
  'sibling',
  'grandfather',
  'grandmother',
  'grandparent',
  'grandson',
  'granddaughter',
  'grandchild',
  'great_grandfather',
  'great_grandmother',
  'great_grandparent',
  'great_grandson',
  'great_granddaughter',
  'great_grandchild',
  'uncle',
  'aunt',
  'nephew',
  'niece',
  'cousin',
] as const

export type PersonRelationshipType = (typeof PERSON_RELATIONSHIP_TYPES)[number]

export function isAllowedRelationshipType(value: string): value is PersonRelationshipType {
  return (PERSON_RELATIONSHIP_TYPES as readonly string[]).includes(value)
}
