/** GET /house-mom, PUT /house-mom, POST/DELETE photo responses */
export interface HouseMomPublic {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  bioHtml?: string | null
  photoUrl?: string | null
}

export interface UpdateHouseMomPayload {
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  bioHtml?: string | null
}
