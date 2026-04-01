/**
 * Public-facing exec mailboxes at kansasbeta.org. Addresses stay with the office;
 * membership changes each term but contact stays the same.
 *
 * Keys are `exec_positions.code` values.
 *
 * Not in catalog (no position row yet): philanthropy, second house-cleaning slot,
 * mental-health — add positions + entries here when those roles exist in the DB.
 */
export const EXEC_POSITION_ROLE_EMAIL_BY_CODE: Record<string, string> = {
  president: 'president@kansasbeta.org',
  vice_president: 'vice-president@kansasbeta.org',
  pledge_trainer: 'pledge-trainer@kansasbeta.org',
  treasurer: 'treasurer@kansasbeta.org',
  risk_management: 'risk@kansasbeta.org',
  vice_president_external: 'vp-external@kansasbeta.org',
  rush_chair: 'recruitment@kansasbeta.org',
  rush_chair_2: 'recruitment@kansasbeta.org',
  rush_chair_3: 'recruitment@kansasbeta.org',
  scholarship: 'scholarship@kansasbeta.org',
  social_chair: 'social@kansasbeta.org',
  social_chair_2: 'social@kansasbeta.org',
  /** Display title "Customs and Traditions" — paired with historian@ per chapter. */
  customs_and_traditions: 'historian@kansasbeta.org',
  house_manager: 'house-manager@kansasbeta.org',
  secretary: 'secretary@kansasbeta.org',
  brotherhood_chair: 'brotherhood@kansasbeta.org',
  brotherhood_chair_2: 'brotherhood@kansasbeta.org',
  director_of_cleaning: 'house-cleaning@kansasbeta.org',
}

export function execRoleEmailForPositionCode(code: string): string | undefined {
  return EXEC_POSITION_ROLE_EMAIL_BY_CODE[code]
}
