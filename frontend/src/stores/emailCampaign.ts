import { defineStore } from 'pinia'
import apiClient from '@/services/api'
import type {
  EmailCampaignSummary,
  EmailCampaignResponse,
  CreateEmailCampaignPayload,
  UpdateEmailCampaignPayload,
  EmailAudiencePayload,
  RecipientPreviewResponse,
  CampaignRecipientsResponse,
} from '@/types/emailCampaign'

export const useEmailCampaignStore = defineStore('emailCampaign', {
  state: () => ({
    list: [] as EmailCampaignSummary[],
    current: null as EmailCampaignResponse | null,
    recipients: null as CampaignRecipientsResponse | null,
    loadingRecipients: false,
    loading: false,
    saving: false,
    sending: false,
    error: null as string | null,
  }),

  actions: {
    async fetchCampaigns(): Promise<void> {
      this.loading = true
      this.error = null
      try {
        const res = await apiClient.get<EmailCampaignSummary[]>('/email-campaigns')
        this.list = res.data
      } catch (e) {
        this.error = 'Failed to load campaigns'
        console.error(e)
        this.list = []
      } finally {
        this.loading = false
      }
    },

    async fetchOne(id: string): Promise<void> {
      this.loading = true
      this.error = null
      try {
        const res = await apiClient.get<EmailCampaignResponse>(`/email-campaigns/${id}`)
        this.current = res.data
      } catch (e) {
        this.error = 'Failed to load campaign'
        console.error(e)
        this.current = null
      } finally {
        this.loading = false
      }
    },

    async fetchRecipients(id: string): Promise<void> {
      this.loadingRecipients = true
      this.recipients = null
      try {
        const res = await apiClient.get<CampaignRecipientsResponse>(
          `/email-campaigns/${id}/recipients`,
        )
        this.recipients = res.data
      } catch (e) {
        console.error(e)
        this.recipients = null
      } finally {
        this.loadingRecipients = false
      }
    },

    async previewRecipients(payload: EmailAudiencePayload): Promise<RecipientPreviewResponse> {
      const res = await apiClient.post<RecipientPreviewResponse>(
        '/email-campaigns/preview-recipients',
        payload,
      )
      return res.data
    },

    async createCampaign(payload: CreateEmailCampaignPayload): Promise<EmailCampaignResponse> {
      this.saving = true
      try {
        const res = await apiClient.post<EmailCampaignResponse>('/email-campaigns', payload)
        this.list = [this.toSummary(res.data), ...this.list]
        return res.data
      } finally {
        this.saving = false
      }
    },

    async updateCampaign(
      id: string,
      payload: UpdateEmailCampaignPayload,
    ): Promise<EmailCampaignResponse> {
      this.saving = true
      try {
        const res = await apiClient.patch<EmailCampaignResponse>(`/email-campaigns/${id}`, payload)
        this.applyToList(res.data)
        if (this.current?.id === id) this.current = res.data
        return res.data
      } finally {
        this.saving = false
      }
    },

    async sendCampaign(id: string): Promise<EmailCampaignResponse> {
      this.sending = true
      try {
        const res = await apiClient.post<EmailCampaignResponse>(`/email-campaigns/${id}/send`)
        this.applyToList(res.data)
        if (this.current?.id === id) this.current = res.data
        return res.data
      } finally {
        this.sending = false
      }
    },

    async deleteCampaign(id: string): Promise<void> {
      await apiClient.delete(`/email-campaigns/${id}`)
      this.list = this.list.filter((c) => c.id !== id)
      if (this.current?.id === id) this.current = null
    },

    toSummary(c: EmailCampaignResponse): EmailCampaignSummary {
      return {
        id: c.id,
        subject: c.subject,
        audienceType: c.audienceType,
        audienceClassYears: c.audienceClassYears,
        audienceIncludeMembers: c.audienceIncludeMembers,
        audienceIncludeParents: c.audienceIncludeParents,
        status: c.status,
        sentAt: c.sentAt,
        recipientCount: c.recipientCount,
        createdByName: c.createdByName,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }
    },

    applyToList(c: EmailCampaignResponse): void {
      const idx = this.list.findIndex((x) => x.id === c.id)
      if (idx !== -1) {
        this.list[idx] = this.toSummary(c)
      }
    },
  },
})
