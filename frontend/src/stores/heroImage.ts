import { defineStore } from 'pinia'
import apiClient from '@/services/api'

export interface HeroImage {
  id: string
  filePath: string
  description?: string
  uploadedBy: string
  isInCarousel: boolean
  createdAt?: string
  updatedAt?: string
}

export interface UploadHeroImageDto {
  description?: string
}

export interface UpdateHeroImageDto {
  description?: string
  isInCarousel?: boolean
}

export interface BulkUpdateCarouselDto {
  imageIds: string[]
}

export interface SignedUrlResponse {
  url: string
  expiresInMinutes: number
}

export const useHeroImageStore = defineStore('heroImage', {
  state: () => ({
    images: [] as HeroImage[],
    carouselImages: [] as HeroImage[],
    loading: false,
    error: null as string | null,
  }),

  getters: {
    // Get images sorted by creation date (newest first)
    sortedImages(): HeroImage[] {
      return [...this.images].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime()
        const dateB = new Date(b.createdAt || 0).getTime()
        return dateB - dateA
      })
    },
  },

  actions: {
    /**
     * Fetch all hero images (admin/editor only)
     */
    async fetchHeroImages() {
      this.loading = true
      this.error = null
      try {
        const response = await apiClient.get<HeroImage[]>('/hero-images')
        this.images = response.data
      } catch (error) {
        this.error = 'Failed to fetch hero images'
        console.error('Error fetching hero images:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Fetch carousel images (public)
     */
    async fetchCarouselImages() {
      this.loading = true
      this.error = null
      try {
        const response = await apiClient.get<HeroImage[]>('/hero-images/carousel')
        this.carouselImages = response.data
      } catch (error) {
        this.error = 'Failed to fetch carousel images'
        console.error('Error fetching carousel images:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Fetch a single hero image by ID
     */
    async fetchHeroImageById(id: string) {
      this.loading = true
      this.error = null
      try {
        const response = await apiClient.get<HeroImage>(`/hero-images/${id}`)
        return response.data
      } catch (error) {
        this.error = 'Failed to fetch hero image'
        console.error('Error fetching hero image:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Upload a new hero image
     */
    async uploadHeroImage(file: File, description?: string) {
      this.loading = true
      this.error = null
      try {
        const formData = new FormData()
        formData.append('file', file)
        if (description) {
          formData.append('description', description)
        }

        const response = await apiClient.post<HeroImage>('/hero-images', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
        const newImage = response.data
        this.images.push(newImage)
        return newImage
      } catch (error) {
        this.error = 'Failed to upload hero image'
        console.error('Error uploading hero image:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Update a hero image
     */
    async updateHeroImage(id: string, updateDto: UpdateHeroImageDto) {
      this.loading = true
      this.error = null
      try {
        const response = await apiClient.patch<HeroImage>(`/hero-images/${id}`, updateDto)
        const updatedImage = response.data
        const index = this.images.findIndex(img => img.id === id)
        if (index > -1) {
          this.images[index] = updatedImage
        }
        // Also update in carousel images if present
        const carouselIndex = this.carouselImages.findIndex(img => img.id === id)
        if (carouselIndex > -1) {
          this.carouselImages[carouselIndex] = updatedImage
        }
        return updatedImage
      } catch (error) {
        this.error = 'Failed to update hero image'
        console.error('Error updating hero image:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Bulk update which images are in the carousel
     */
    async bulkUpdateCarousel(imageIds: string[]) {
      this.loading = true
      this.error = null
      try {
        const response = await apiClient.patch<HeroImage[]>('/hero-images/carousel', {
          imageIds,
        })
        // Refresh all images to get updated carousel status
        await this.fetchHeroImages()
        return response.data
      } catch (error) {
        this.error = 'Failed to update carousel'
        console.error('Error updating carousel:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Delete a hero image
     */
    async deleteHeroImage(id: string) {
      this.loading = true
      this.error = null
      try {
        await apiClient.delete(`/hero-images/${id}`)
        const index = this.images.findIndex(img => img.id === id)
        if (index > -1) {
          this.images.splice(index, 1)
        }
        const carouselIndex = this.carouselImages.findIndex(img => img.id === id)
        if (carouselIndex > -1) {
          this.carouselImages.splice(carouselIndex, 1)
        }
        return true
      } catch (error) {
        this.error = 'Failed to delete hero image'
        console.error('Error deleting hero image:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Delete multiple hero images
     */
    async deleteManyHeroImages(ids: string[]) {
      this.loading = true
      this.error = null
      try {
        await apiClient.post('/hero-images/bulk-delete', { ids })
        // Remove from local state
        this.images = this.images.filter(img => !ids.includes(img.id))
        this.carouselImages = this.carouselImages.filter(img => !ids.includes(img.id))
        return true
      } catch (error) {
        this.error = 'Failed to delete hero images'
        console.error('Error deleting hero images:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Get a signed URL for a hero image
     */
    async getSignedUrl(id: string): Promise<string> {
      try {
        const response = await apiClient.get<SignedUrlResponse>(`/hero-images/${id}/signed-url`)
        return response.data.url
      } catch (error) {
        console.error('Error fetching signed URL:', error)
        throw error
      }
    },
  },
})

