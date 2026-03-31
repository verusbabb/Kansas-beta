import type { PersonResponse } from '@/types/person'
import type { PersonRelationshipResponse } from '@/types/personRelationship'
import { relationshipTypeLabel } from '@/constants/relationshipTypes'

/** Member↔member edge only; parent↔member family links are not labeled legacy. */
function legacyClause(anchor: PersonResponse, c: PersonRelationshipResponse['counterpart']): string {
  return anchor.isMember && c.isMember ? ' (legacy relationship)' : ''
}

/**
 * Plain-language sentence for one edge, from the anchor person's perspective.
 * Backend: `from` is the `relationshipType` of `to`.
 */
export function personRelationshipPhrase(
  rel: PersonRelationshipResponse,
  anchor: PersonResponse,
): string {
  const c = rel.counterpart
  const cName = `${c.firstName} ${c.lastName}`.trim()
  const vName = `${anchor.firstName} ${anchor.lastName}`.trim()
  const typeLabel = relationshipTypeLabel(rel.relationshipType)
  const legacy = legacyClause(anchor, c)

  if (!typeLabel) {
    return rel.viewerIsFrom
      ? `${vName} and ${cName} are linked; relationship type not specified yet${legacy}.`
      : `${cName} and ${vName} are linked; relationship type not specified yet${legacy}.`
  }

  if (rel.viewerIsFrom) {
    return `${vName} is ${cName}'s ${typeLabel.toLowerCase()}${legacy}.`
  }
  return `${cName} is ${vName}'s ${typeLabel.toLowerCase()}${legacy}.`
}
