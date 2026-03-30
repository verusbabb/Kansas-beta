import { defineStore } from 'pinia'
import apiClient from '@/services/api'
import type { PersonResponse, UpdatePersonPayload } from '@/types/person'

export const usePeopleStore = defineStore('people', {
  state: () => ({
    list: [] as PersonResponse[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchPeople() {
      this.loading = true
      this.error = null
      try {
        const { data } = await apiClient.get<PersonResponse[]>('/people')
        this.list = Array.isArray(data) ? data : []
      } catch (err: unknown) {
        this.error = 'Failed to load directory.'
        this.list = []
        console.error('Error fetching people:', err)
      } finally {
        this.loading = false
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
  },
})
