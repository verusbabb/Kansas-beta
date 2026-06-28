/**
 * Viewer-centric labels and Legacy/Family tags for directory connections.
 * Storage semantics: `from` is the `relationshipType` of `to`.
 */

export type ConnectionTag = 'legacy' | 'family'

/** Title for counterpart when viewer is `to` (counterpart is `from`): counterpart is [type] of viewer. */
const ROLE_AS_FROM_TO_VIEWER: Record<string, string> = {
  parent: 'Parent',
  son: 'Son',
  brother: 'Brother',
  cousin: 'Cousin',
  grandparent: 'Grandparent',
  great_grandparent: 'Great-grandparent',
  great_great_grandparent: 'Great-great-grandparent',
  grandchild: 'Grandchild',
  great_grandchild: 'Great-grandchild',
  great_great_grandchild: 'Great-great-grandchild',
  uncle: 'Uncle',
  nephew: 'Nephew',
}

/**
 * Counterpart is `to`; viewer is `from` (viewer is [type] of counterpart).
 * Label describes counterpart relative to viewer.
 */
const COUNTERPART_LABEL_WHEN_VIEWER_IS_FROM: Record<string, string> = {
  parent: 'Son',
  son: 'Parent',
  brother: 'Brother',
  cousin: 'Cousin',
  grandparent: 'Grandchild',
  great_grandparent: 'Great-grandchild',
  great_great_grandparent: 'Great-great-grandchild',
  grandchild: 'Grandparent',
  great_grandchild: 'Great-grandparent',
  great_great_grandchild: 'Great-great-grandparent',
  uncle: 'Nephew',
  nephew: 'Uncle',
}

function titleCaseType(type: string): string {
  const known = ROLE_AS_FROM_TO_VIEWER[type]
  if (known) return known
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('-')
}

/**
 * How the viewer would label the counterpart (e.g. Parent, Son, Brother).
 */
export function viewerCounterpartRoleLabel(
  relationshipType: string | null | undefined,
  viewerIsFrom: boolean,
): string {
  const t = relationshipType?.trim()
  if (!t) return 'Connection'

  if (viewerIsFrom) {
    return COUNTERPART_LABEL_WHEN_VIEWER_IS_FROM[t] ?? titleCaseType(t)
  }
  return ROLE_AS_FROM_TO_VIEWER[t] ?? titleCaseType(t)
}

function isFamilyKinType(type: string): boolean {
  return type in ROLE_AS_FROM_TO_VIEWER
}

/**
 * Legacy = both people are chapter members.
 * Family = any kin relationship type is set (including brother as a biological sibling).
 * Both tags can apply at once (e.g. a father/son who are both members).
 */
export function computeConnectionTags(
  viewerIsMember: boolean,
  counterpartIsMember: boolean,
  relationshipType: string | null | undefined,
): ConnectionTag[] {
  const tags: ConnectionTag[] = []
  const bothMembers = viewerIsMember && counterpartIsMember
  if (bothMembers) tags.push('legacy')

  const t = relationshipType?.trim()
  if (!t || !isFamilyKinType(t)) {
    return tags
  }

  tags.push('family')
  return tags
}
