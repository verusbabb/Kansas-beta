/**
 * Lets admin sub-views register unsaved edit state so Admin.vue can confirm before
 * switching sections or leaving the site.
 */
export type AdminUnsavedEntry = {
  id: string
  isDirty: () => boolean
  /** Reset local UI to last saved / safe state (or close dialogs). */
  discard: () => void
}

const entries: AdminUnsavedEntry[] = []

export function registerAdminUnsaved(entry: AdminUnsavedEntry): () => void {
  entries.push(entry)
  return () => {
    const i = entries.indexOf(entry)
    if (i !== -1) entries.splice(i, 1)
  }
}

export function adminHasUnsavedChanges(): boolean {
  return entries.some((e) => e.isDirty())
}

export function adminDiscardAllUnsaved(): void {
  for (const e of entries) {
    if (e.isDirty()) e.discard()
  }
}
