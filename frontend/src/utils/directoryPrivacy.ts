/**
 * Tooltip when the API omits a contact field but `has*OnFile` indicates data exists.
 */
export function directoryContactHiddenTooltip(isAuthenticated: boolean): string {
  if (!isAuthenticated) {
    return 'Sign in with your chapter account to see this when the member has chosen to share it.'
  }
  return 'This member has chosen not to share this with other signed-in members.'
}
