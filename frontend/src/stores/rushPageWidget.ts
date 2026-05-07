import { defineStore } from 'pinia'
import apiClient from '@/services/api'

export interface RushPageWidget {
  id: string
  slotIndex: number
  title: string
  bodyHtml?: string
  updatedAt?: string
}

export const useRushPageWidgetStore = defineStore('rushPageWidget', {
  state: () => ({
    widgets: [] as RushPageWidget[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchPublic() {
      this.loading = true
      this.error = null
      try {
        const res = await apiClient.get<RushPageWidget[]>('/rush-page-widgets/public')
        this.widgets = res.data
      } catch (e) {
        this.error = 'Failed to load rush widgets'
        console.error(e)
        this.widgets = []
      } finally {
        this.loading = false
      }
    },

    async fetchAll() {
      this.loading = true
      this.error = null
      try {
        const res = await apiClient.get<RushPageWidget[]>('/rush-page-widgets')
        this.widgets = res.data
      } catch (e) {
        this.error = 'Failed to load rush widgets'
        console.error(e)
        throw e
      } finally {
        this.loading = false
      }
    },

    async update(id: string, payload: { title?: string; bodyHtml?: string }) {
      this.loading = true
      this.error = null
      try {
        await apiClient.patch<RushPageWidget>(`/rush-page-widgets/${id}`, payload)
        await this.fetchAll()
      } catch (e) {
        this.error = 'Failed to update widget'
        console.error(e)
        throw e
      } finally {
        this.loading = false
      }
    },
  },
})
