import { defineStore } from 'pinia'
import apiClient from '@/services/api'

export interface RushPhoto {
  id: string
  filePath: string
  caption?: string
  sortOrder: number
  uploadedBy: string
  createdAt?: string
  updatedAt?: string
  /** resolved signed URL — populated client-side after fetching */
  signedUrl?: string
}

export interface UpdateRushPhotoDto {
  caption?: string
  sortOrder?: number
}

export interface SignedUrlResponse {
  url: string
  expiresInMinutes: number
}

export const useRushPhotoStore = defineStore('rushPhoto', {
  state: () => ({
    photos: [] as RushPhoto[],
    publicPhotos: [] as RushPhoto[],
    loading: false,
    error: null as string | null,
  }),

  getters: {
    sortedPhotos(): RushPhoto[] {
      return [...this.photos].sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      })
    },
    sortedPublicPhotos(): RushPhoto[] {
      return [...this.publicPhotos].sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      })
    },
  },

  actions: {
    async fetchPublic() {
      this.loading = true
      this.error = null
      try {
        const res = await apiClient.get<RushPhoto[]>('/rush-photos/public')
        this.publicPhotos = res.data
      } catch (e) {
        this.error = 'Failed to load rush photos'
        console.error(e)
        this.publicPhotos = []
      } finally {
        this.loading = false
      }
    },

    async fetchAll() {
      this.loading = true
      this.error = null
      try {
        const res = await apiClient.get<RushPhoto[]>('/rush-photos')
        this.photos = res.data
      } catch (e) {
        this.error = 'Failed to load rush photos'
        console.error(e)
        throw e
      } finally {
        this.loading = false
      }
    },

    async upload(file: File, caption?: string): Promise<RushPhoto> {
      const formData = new FormData()
      formData.append('file', file)
      if (caption?.trim()) formData.append('caption', caption.trim())
      const res = await apiClient.post<RushPhoto>('/rush-photos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await this.fetchAll()
      return res.data
    },

    async update(id: string, dto: UpdateRushPhotoDto): Promise<void> {
      await apiClient.patch(`/rush-photos/${id}`, dto)
      await this.fetchAll()
    },

    async remove(id: string): Promise<void> {
      await apiClient.delete(`/rush-photos/${id}`)
      await this.fetchAll()
    },

    async removeMany(ids: string[]): Promise<void> {
      await apiClient.post('/rush-photos/bulk-delete', { ids })
      await this.fetchAll()
    },

    async getSignedUrl(id: string): Promise<string> {
      const res = await apiClient.get<SignedUrlResponse>(`/rush-photos/${id}/signed-url`)
      return res.data.url
    },

    async loadSignedUrls(photos: RushPhoto[]): Promise<void> {
      await Promise.all(
        photos.map(async (photo) => {
          if (!photo.signedUrl) {
            try {
              photo.signedUrl = await this.getSignedUrl(photo.id)
            } catch {
              photo.signedUrl = undefined
            }
          }
        }),
      )
    },

    async loadPublicSignedUrls(): Promise<void> {
      await this.loadSignedUrls(this.publicPhotos)
    },
  },
})
