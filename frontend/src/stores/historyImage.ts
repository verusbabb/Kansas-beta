import { defineStore } from 'pinia'
import apiClient from '@/services/api'

export interface HistoryImage {
  id: string
  filePath: string
  caption?: string
  altText?: string
  sortOrder: number
  uploadedBy: string
  createdAt?: string
  updatedAt?: string
}

export const useHistoryImageStore = defineStore('historyImage', {
  state: () => ({
    images: [] as HistoryImage[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchPublic() {
      this.loading = true
      this.error = null
      try {
        const response = await apiClient.get<HistoryImage[]>('/history-images/public')
        this.images = response.data
      } catch (error) {
        this.error = 'Failed to fetch history images'
        console.error('Error fetching history images:', error)
      } finally {
        this.loading = false
      }
    },

    async fetchAll() {
      this.loading = true
      this.error = null
      try {
        const response = await apiClient.get<HistoryImage[]>('/history-images')
        this.images = response.data
      } catch (error) {
        this.error = 'Failed to fetch history images'
        console.error('Error fetching history images:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async upload(file: File, caption?: string, altText?: string, sortOrder?: number): Promise<HistoryImage> {
      const formData = new FormData()
      formData.append('file', file)
      if (caption) formData.append('caption', caption)
      if (altText) formData.append('altText', altText)
      if (sortOrder !== undefined) formData.append('sortOrder', String(sortOrder))

      const response = await apiClient.post<HistoryImage>('/history-images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      this.images.push(response.data)
      this.images.sort((a, b) => a.sortOrder - b.sortOrder)
      return response.data
    },

    async update(id: string, data: Partial<Pick<HistoryImage, 'caption' | 'altText' | 'sortOrder'>>) {
      const response = await apiClient.patch<HistoryImage>(`/history-images/${id}`, data)
      const idx = this.images.findIndex((i) => i.id === id)
      if (idx !== -1) this.images[idx] = response.data
      return response.data
    },

    async getSignedUrl(id: string): Promise<string> {
      const response = await apiClient.get<{ url: string }>(`/history-images/${id}/signed-url`)
      return response.data.url
    },

    async remove(id: string) {
      await apiClient.delete(`/history-images/${id}`)
      this.images = this.images.filter((i) => i.id !== id)
    },

    async removeMany(ids: string[]) {
      await apiClient.post('/history-images/bulk-delete', { ids })
      this.images = this.images.filter((i) => !ids.includes(i.id))
    },
  },
})
