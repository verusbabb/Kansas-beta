import { defineStore } from 'pinia'
import apiClient from '@/services/api'

/** Rush timeline item (matches GET /rush-events/public) */
export interface RushEvent {
  id: string
  title: string
  displayDate: string
  description?: string
  icon: string
  location?: string
  timeLabel?: string
  sortOrder: number
}

export const useRushStore = defineStore('rush', {
  state: () => ({
    events: [] as RushEvent[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchRushEvents() {
      this.loading = true
      this.error = null
      try {
        const response = await apiClient.get<RushEvent[]>('/rush-events/public')
        this.events = response.data
      } catch (error) {
        this.error = 'Failed to fetch rush events'
        console.error('Error fetching rush events:', error)
        this.events = []
      } finally {
        this.loading = false
      }
    },
  },
})
