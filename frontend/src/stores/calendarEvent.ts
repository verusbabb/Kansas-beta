import { defineStore } from 'pinia'
import apiClient from '@/services/api'

export interface CalendarEvent {
  id: string
  name: string
  description?: string
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  startTime?: string // HH:mm
  endTime?: string // HH:mm
  allDay: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CreateCalendarEventDto {
  name: string
  description?: string
  startDate: string
  endDate: string
  startTime?: string
  endTime?: string
  allDay: boolean
}

export interface UpdateCalendarEventDto {
  name?: string
  description?: string
  startDate?: string
  endDate?: string
  startTime?: string
  endTime?: string
  allDay?: boolean
}

export const useCalendarEventStore = defineStore('calendarEvent', {
  state: () => ({
    events: [] as CalendarEvent[],
    upcomingEvents: [] as CalendarEvent[],
    loading: false,
    error: null as string | null,
    selectedEvent: null as CalendarEvent | null,
  }),

  getters: {
    /**
     * Get events grouped by date
     */
    eventsByDate: (state) => {
      const grouped: Record<string, CalendarEvent[]> = {}
      state.upcomingEvents.forEach((event) => {
        // For multi-day events, add to each date in the range
        const start = new Date(event.startDate)
        const end = new Date(event.endDate)
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateKey = d.toISOString().split('T')[0]
          if (!grouped[dateKey]) {
            grouped[dateKey] = []
          }
          grouped[dateKey].push(event)
        }
      })
      return grouped
    },

    /**
     * Get events for a specific date
     */
    getEventsForDate: (state) => (date: string) => {
      return state.upcomingEvents.filter((event) => {
        const eventStart = new Date(event.startDate)
        const eventEnd = new Date(event.endDate)
        const targetDate = new Date(date)
        targetDate.setHours(0, 0, 0, 0)
        
        return targetDate >= eventStart && targetDate <= eventEnd
      })
    },
  },

  actions: {
    /**
     * Fetch all calendar events (admin/editor only)
     */
    async fetchAll() {
      this.loading = true
      this.error = null
      try {
        const response = await apiClient.get<CalendarEvent[]>('/calendar-events')
        this.events = response.data
      } catch (error: any) {
        this.error = 'Failed to fetch calendar events'
        console.error('Error fetching calendar events:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Fetch upcoming calendar events (public)
     */
    async fetchUpcoming() {
      this.loading = true
      this.error = null
      try {
        const response = await apiClient.get<CalendarEvent[]>('/calendar-events/upcoming')
        this.upcomingEvents = response.data
      } catch (error: any) {
        this.error = 'Failed to fetch upcoming calendar events'
        console.error('Error fetching upcoming calendar events:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Fetch a single calendar event by ID
     */
    async fetchOne(id: string) {
      this.loading = true
      this.error = null
      try {
        const response = await apiClient.get<CalendarEvent>(`/calendar-events/${id}`)
        this.selectedEvent = response.data
        return response.data
      } catch (error: any) {
        this.error = 'Failed to fetch calendar event'
        console.error('Error fetching calendar event:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Create a new calendar event
     */
    async create(event: CreateCalendarEventDto) {
      this.loading = true
      this.error = null
      try {
        const response = await apiClient.post<CalendarEvent>('/calendar-events', event)
        // Refresh the list
        await this.fetchAll()
        return response.data
      } catch (error: any) {
        this.error = 'Failed to create calendar event'
        console.error('Error creating calendar event:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Update a calendar event
     */
    async update(id: string, event: UpdateCalendarEventDto) {
      this.loading = true
      this.error = null
      try {
        const response = await apiClient.patch<CalendarEvent>(`/calendar-events/${id}`, event)
        // Refresh the list
        await this.fetchAll()
        return response.data
      } catch (error: any) {
        this.error = 'Failed to update calendar event'
        console.error('Error updating calendar event:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Delete a calendar event
     */
    async delete(id: string) {
      this.loading = true
      this.error = null
      try {
        await apiClient.delete(`/calendar-events/${id}`)
        // Refresh the list
        await this.fetchAll()
      } catch (error: any) {
        this.error = 'Failed to delete calendar event'
        console.error('Error deleting calendar event:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Clear selected event
     */
    clearSelected() {
      this.selectedEvent = null
    },
  },
})

