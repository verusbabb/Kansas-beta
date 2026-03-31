import type { PersonResponse } from '@/types/person'
import type { PersonRelationshipResponse } from '@/types/personRelationship'
import { relationshipTypeLabel } from '@/constants/relationshipTypes'

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

  if (!typeLabel) {
    return rel.viewerIsFrom
      ? `${vName} and ${cName} are linked; relationship type not specified yet.`
      : `${cName} and ${vName} are linked; relationship type not specified yet.`
  }

  if (rel.viewerIsFrom) {
    return `${vName} is ${cName}'s ${typeLabel.toLowerCase()}.`
  }
  return `${cName} is ${vName}'s ${typeLabel.toLowerCase()}.`
}
