import { defineStore } from 'pinia'
import apiClient from '@/services/api'
import type {
  PersonResponse,
  PeopleBulkImportResponse,
  UpdatePersonPayload,
} from '@/types/person'
import type { PersonProfileResponse } from '@/types/personProfile'

export const usePeopleStore = defineStore('people', {
  state: () => ({
    list: [] as PersonResponse[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    /** Refetch directory. Use `{ silent: true }` after saves so the table does not swap to the full-page loader. */
    /** Authenticated viewers (and above) only; backend returns 401/403 otherwise. */
    async fetchPersonProfile(id: string): Promise<PersonProfileResponse> {
      const { data } = await apiClient.get<PersonProfileResponse>(`/people/${id}`)
      return data
    },

    async fetchPeople(opts?: { silent?: boolean }) {
      const silent = opts?.silent === true
      if (!silent) {
        this.loading = true
        this.error = null
      }
      try {
        const { data } = await apiClient.get<PersonResponse[]>('/people')
        this.list = Array.isArray(data) ? data : []
      } catch (err: unknown) {
        if (silent) {
          console.error('Error refreshing directory:', err)
        } else {
          this.error = 'Failed to load directory.'
          this.list = []
          console.error('Error fetching people:', err)
        }
      } finally {
        if (!silent) {
          this.loading = false
        }
      }
    },

    async updatePerson(id: string, payload: UpdatePersonPayload): Promise<PersonResponse> {
      const { data } = await apiClient.patch<PersonResponse>(`/people/${id}`, payload)
      const idx = this.list.findIndex((p) => p.id === id)
      if (idx >= 0) {
        this.list[idx] = data
      }
      return data
    },

    async deletePerson(id: string): Promise<void> {
      await apiClient.delete(`/people/${id}`)
      this.list = this.list.filter((p) => p.id !== id)
    },

    async uploadHeadshot(id: string, file: File): Promise<PersonResponse> {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await apiClient.post<PersonResponse>(`/people/${id}/headshot`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const idx = this.list.findIndex((p) => p.id === id)
      if (idx >= 0) this.list[idx] = data
      return data
    },

    async clearHeadshot(id: string): Promise<PersonResponse> {
      const { data } = await apiClient.delete<PersonResponse>(`/people/${id}/headshot`)
      const idx = this.list.findIndex((p) => p.id === id)
      if (idx >= 0) this.list[idx] = data
      return data
    },

    async bulkImportPeople(file: File): Promise<PeopleBulkImportResponse> {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await apiClient.post<PeopleBulkImportResponse>('/people/import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await this.fetchPeople({ silent: true })
      return data
    },
  },
})
