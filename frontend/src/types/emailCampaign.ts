export type EmailAudienceType =
  | 'everyone'
  | 'all_members'
  | 'all_parents'
  | 'class_years'
  | 'custom'

export type EmailCampaignStatus = 'draft' | 'sent'

// ── API payloads ──────────────────────────────────────────────────────────────

export interface EmailAudiencePayload {
  audienceType: EmailAudienceType
  audienceClassYears?: number[]
  audienceIncludeMembers?: boolean
  audienceIncludeParents?: boolean
  audiencePersonIds?: string[]
}

export interface CreateEmailCampaignPayload extends EmailAudiencePayload {
  subject: string
  bodyHtml: string
}

export type UpdateEmailCampaignPayload = Partial<CreateEmailCampaignPayload>

// ── API responses ─────────────────────────────────────────────────────────────

export interface EmailCampaignSummary {
  id: string
  subject: string
  audienceType: EmailAudienceType
  audienceClassYears: number[] | null
  audienceIncludeMembers: boolean
  audienceIncludeParents: boolean
  status: EmailCampaignStatus
  sentAt: string | null
  recipientCount: number | null
  createdByName: string | null
  createdAt: string
  updatedAt: string
}

export interface EmailCampaignResponse extends EmailCampaignSummary {
  bodyHtml: string
  audiencePersonIds: string[] | null
}

export interface RecipientPreviewItem {
  id: string
  firstName: string
  lastName: string
  email: string
}

export interface RecipientPreviewResponse {
  count: number
  sample: RecipientPreviewItem[]
}

// ── Sent-campaign recipients (snapshot + delivery/open tracking) ────────────────

export type RecipientStatus = 'sent' | 'delivered' | 'opened' | 'bounced' | 'dropped' | 'spam'

export interface EmailCampaignRecipient {
  id: string
  firstName: string
  lastName: string
  email: string
  status: RecipientStatus
  deliveredAt: string | null
  openedAt: string | null
  openCount: number
  bounceReason: string | null
  lastEventAt: string | null
}

export interface CampaignRecipientsSummary {
  total: number
  delivered: number
  opened: number
  bounced: number
  dropped: number
  spam: number
}

export interface CampaignRecipientsResponse {
  summary: CampaignRecipientsSummary
  recipients: EmailCampaignRecipient[]
}

export const RECIPIENT_STATUS_LABELS: Record<RecipientStatus, string> = {
  sent: 'Sent',
  delivered: 'Delivered',
  opened: 'Opened',
  bounced: 'Bounced',
  dropped: 'Dropped',
  spam: 'Spam report',
}

export const RECIPIENT_STATUS_SEVERITY: Record<RecipientStatus, string> = {
  sent: 'secondary',
  delivered: 'info',
  opened: 'success',
  bounced: 'danger',
  dropped: 'danger',
  spam: 'warn',
}

// ── UI label maps ─────────────────────────────────────────────────────────────

export const AUDIENCE_TYPE_LABELS: Record<EmailAudienceType, string> = {
  everyone: 'Everyone (members + parents)',
  all_members: 'All members',
  all_parents: 'All parents',
  class_years: 'Specific pledge class years',
  custom: 'Custom selection',
}

export const STATUS_LABELS: Record<EmailCampaignStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
}

export const STATUS_SEVERITY: Record<EmailCampaignStatus, string> = {
  draft: 'warn',
  sent: 'success',
}
