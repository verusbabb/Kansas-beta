import { defineStore } from 'pinia'
// import apiClient from '@/services/api'

export interface Event {
  id: string
  title: string
  description: string
  date: string
  time?: string
  location?: string
  category: string
  icon: string
}

export const useEventStore = defineStore('event', {
  state: () => ({
    events: [] as Event[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchEvents() {
      this.loading = true
      this.error = null
      try {
        // TODO: Connect to backend API
        // const response = await apiClient.get<Event[]>('/events')
        // this.events = response.data
        
        // Placeholder data for now
        this.events = []
      } catch (error) {
        this.error = 'Failed to fetch events'
        console.error('Error fetching events:', error)
      } finally {
        this.loading = false
      }
    },

    async fetchEventById(id: string) {
      this.loading = true
      this.error = null
      try {
        // TODO: Connect to backend API
        // const response = await apiClient.get<Event>(`/events/${id}`)
        // return response.data
        
        return this.events.find(e => e.id === id) || null
      } catch (error) {
        this.error = 'Failed to fetch event'
        console.error('Error fetching event:', error)
        return null
      } finally {
        this.loading = false
      }
    },
  },
})

