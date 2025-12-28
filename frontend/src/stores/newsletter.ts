import { defineStore } from 'pinia'
import apiClient from '@/services/api'

export interface Newsletter {
  id: string
  filePath: string
  season: 'spring' | 'summer' | 'fall' | 'winter'
  year: number
  createdAt?: string
  updatedAt?: string
}

export interface SignedUrlResponse {
  url: string
  expiresInMinutes: number
}

export const useNewsletterStore = defineStore('newsletter', {
  state: () => ({
    newsletters: [] as Newsletter[],
    loading: false,
    error: null as string | null,
  }),

  getters: {
    // Get newsletters sorted by date (year and season)
    // Backend already returns them sorted, but we keep this for consistency
    sortedNewsletters(): Newsletter[] {
      const seasonOrder = { spring: 0, summer: 1, fall: 2, winter: 3 }
      return [...this.newsletters].sort((a, b) => {
        // Sort by year first (descending - newest first)
        if (b.year !== a.year) {
          return b.year - a.year
        }
        // Then by season within the same year
        return seasonOrder[b.season] - seasonOrder[a.season]
      })
    },
  },

  actions: {
    async fetchNewsletters() {
      this.loading = true
      this.error = null
      try {
        const response = await apiClient.get<Newsletter[]>('/newsletters')
        this.newsletters = response.data
      } catch (error) {
        this.error = 'Failed to fetch newsletters'
        console.error('Error fetching newsletters:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchNewsletterById(id: string) {
      this.loading = true
      this.error = null
      try {
        const response = await apiClient.get<Newsletter>(`/newsletters/${id}`)
        return response.data
      } catch (error) {
        this.error = 'Failed to fetch newsletter'
        console.error('Error fetching newsletter:', error)
        return null
      } finally {
        this.loading = false
      }
    },

    async addNewsletter(file: File, season: 'spring' | 'summer' | 'fall' | 'winter', year: number) {
      this.loading = true
      this.error = null
      try {
        // Create FormData for multipart/form-data upload
        const formData = new FormData()
        formData.append('file', file)
        formData.append('season', season)
        formData.append('year', year.toString())

        const response = await apiClient.post<Newsletter>('/newsletters', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
        const newNewsletter = response.data
        this.newsletters.push(newNewsletter)
        return newNewsletter
      } catch (error) {
        this.error = 'Failed to create newsletter'
        console.error('Error creating newsletter:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async getSignedUrl(id: string): Promise<string> {
      try {
        const response = await apiClient.get<SignedUrlResponse>(`/newsletters/${id}/signed-url`)
        return response.data.url
      } catch (error) {
        console.error('Error fetching signed URL:', error)
        throw error
      }
    },

    async removeNewsletter(id: string) {
      this.loading = true
      this.error = null
      try {
        await apiClient.delete(`/newsletters/${id}`)
        const index = this.newsletters.findIndex(n => n.id === id)
        if (index > -1) {
          this.newsletters.splice(index, 1)
        }
        return true
      } catch (error) {
        this.error = 'Failed to delete newsletter'
        console.error('Error deleting newsletter:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
  },
})

