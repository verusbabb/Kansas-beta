/**
 * Directed edge semantics: `from` is the `relationshipType` of `to`
 * (e.g. from=Bob, to=Sam, type=uncle → Bob is Sam’s uncle).
 * Nullable type = linked, relationship not yet specified.
 *
 * Fraternity-focused: male members + parents; gender-neutral parent/grandparent tiers.
 */
export const PERSON_RELATIONSHIP_TYPES = [
  'parent',
  'son',
  'brother',
  'cousin',
  'grandparent',
  'great_grandparent',
  'great_great_grandparent',
  'grandchild',
  'great_grandchild',
  'great_great_grandchild',
  'uncle',
  'nephew',
] as const

export type PersonRelationshipType = (typeof PERSON_RELATIONSHIP_TYPES)[number]

export function isAllowedRelationshipType(value: string): value is PersonRelationshipType {
  return (PERSON_RELATIONSHIP_TYPES as readonly string[]).includes(value)
}
