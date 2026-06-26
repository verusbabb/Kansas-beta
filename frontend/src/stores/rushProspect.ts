import { defineStore } from 'pinia'
import apiClient from '@/services/api'
import type {
  RushProspectSummary,
  RushProspectResponse,
  RushProspectActivity,
  MemberLegacySearchResult,
  CreateRushProspectPayload,
  UpdateRushProspectPayload,
  CreateActivityPayload,
  RushChair,
} from '@/types/rushProspect'

export const useRushProspectStore = defineStore('rushProspect', {
  state: () => ({
    list: [] as RushProspectSummary[],
    current: null as RushProspectResponse | null,
    rushChairs: [] as RushChair[],
    loading: false,
    submitting: false,
    error: null as string | null,
  }),

  actions: {
    /** Admin: fetch rush chairs for the assigned-to dropdown */
    async fetchRushChairs(): Promise<void> {
      try {
        const res = await apiClient.get<RushChair[]>('/exec-team/rush-chairs')
        this.rushChairs = res.data
      } catch {
        this.rushChairs = []
      }
    },

    /** Public: submit an application (no auth token needed) */
    async submitApplication(payload: CreateRushProspectPayload): Promise<RushProspectSummary> {
      this.submitting = true
      this.error = null
      try {
        const res = await apiClient.post<RushProspectSummary>('/rush-prospects', payload)
        return res.data
      } catch (e) {
        this.error = 'Failed to submit application'
        throw e
      } finally {
        this.submitting = false
      }
    },

    /** Public: search members by name for legacy field autocomplete */
    async searchLegacyMembers(q: string): Promise<MemberLegacySearchResult[]> {
      if (!q || q.trim().length < 2) return []
      try {
        const res = await apiClient.get<MemberLegacySearchResult[]>('/rush-prospects/legacy-search', {
          params: { q },
        })
        return res.data
      } catch {
        return []
      }
    },

    /** Admin/editor: fetch all prospects for a given rush year */
    async fetchProspects(rushYear?: number, stage?: string, search?: string): Promise<void> {
      this.loading = true
      this.error = null
      try {
        const params: Record<string, string | number> = {}
        if (rushYear) params['rushYear'] = rushYear
        if (stage) params['stage'] = stage
        if (search) params['search'] = search
        const res = await apiClient.get<RushProspectSummary[]>('/rush-prospects', { params })
        this.list = res.data
      } catch (e) {
        this.error = 'Failed to load prospects'
        console.error(e)
        this.list = []
      } finally {
        this.loading = false
      }
    },

    /** Admin/editor: fetch one prospect with full activity log */
    async fetchOne(id: string): Promise<void> {
      this.loading = true
      this.error = null
      try {
        const res = await apiClient.get<RushProspectResponse>(`/rush-prospects/${id}`)
        this.current = res.data
      } catch (e) {
        this.error = 'Failed to load prospect'
        console.error(e)
        this.current = null
      } finally {
        this.loading = false
      }
    },

    /** Admin/editor: update prospect fields or pipeline stage */
    async updateProspect(id: string, payload: UpdateRushProspectPayload): Promise<RushProspectResponse> {
      const res = await apiClient.patch<RushProspectResponse>(`/rush-prospects/${id}`, payload)
      // Update summary in list
      const idx = this.list.findIndex((p) => p.id === id)
      if (idx !== -1) {
        this.list[idx] = {
          ...this.list[idx],
          ...res.data,
        }
      }
      if (this.current?.id === id) {
        this.current = res.data
      }
      return res.data
    },

    /** Admin/editor: log a manual activity */
    async addActivity(prospectId: string, payload: CreateActivityPayload): Promise<RushProspectActivity> {
      const res = await apiClient.post<RushProspectActivity>(
        `/rush-prospects/${prospectId}/activities`,
        payload,
      )
      if (this.current?.id === prospectId) {
        this.current = {
          ...this.current,
          activities: [res.data, ...this.current.activities],
        }
      }
      return res.data
    },

    /** Admin only: soft-delete a prospect */
    async deleteProspect(id: string): Promise<void> {
      await apiClient.delete(`/rush-prospects/${id}`)
      this.list = this.list.filter((p) => p.id !== id)
      if (this.current?.id === id) this.current = null
    },
  },
})
