import { defineStore } from 'pinia'
import apiClient from '@/services/api'

export interface RushEvent {
  id: string
  title: string
  displayDate: string
  description?: string
  icon: string
  location?: string
  timeLabel?: string
  sortOrder: number
  createdAt?: string
  updatedAt?: string
}

export interface CreateRushEventDto {
  title: string
  displayDate: string
  description?: string
  icon?: string
  location?: string
  timeLabel?: string
  sortOrder?: number
}

export interface UpdateRushEventDto {
  title?: string
  displayDate?: string
  description?: string
  icon?: string
  location?: string
  timeLabel?: string
  sortOrder?: number
}

export const useRushEventStore = defineStore('rushEvent', {
  state: () => ({
    events: [] as RushEvent[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchAll() {
      this.loading = true
      this.error = null
      try {
        const response = await apiClient.get<RushEvent[]>('/rush-events')
        this.events = response.data
      } catch (error: unknown) {
        this.error = 'Failed to fetch rush events'
        console.error('Error fetching rush events:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async create(payload: CreateRushEventDto) {
      this.loading = true
      this.error = null
      try {
        await apiClient.post<RushEvent>('/rush-events', payload)
        await this.fetchAll()
      } catch (error: unknown) {
        this.error = 'Failed to create rush event'
        console.error('Error creating rush event:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async update(id: string, payload: UpdateRushEventDto) {
      this.loading = true
      this.error = null
      try {
        await apiClient.patch<RushEvent>(`/rush-events/${id}`, payload)
        await this.fetchAll()
      } catch (error: unknown) {
        this.error = 'Failed to update rush event'
        console.error('Error updating rush event:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async delete(id: string) {
      this.loading = true
      this.error = null
      try {
        await apiClient.delete(`/rush-events/${id}`)
        await this.fetchAll()
      } catch (error: unknown) {
        this.error = 'Failed to delete rush event'
        console.error('Error deleting rush event:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
  },
})
