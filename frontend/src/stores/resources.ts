import { defineStore } from 'pinia'
import apiClient from '@/services/api'
import type { ResourceResponseDto, ResourceVersionDto, CreateResourceDto, UpdateResourceDto } from '@/types/resource'

export const useResourceStore = defineStore('resources', {
  state: () => ({
    resources: [] as ResourceResponseDto[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchResources() {
      this.loading = true
      this.error = null
      try {
        const response = await apiClient.get<ResourceResponseDto[]>('/resources')
        this.resources = response.data
      } catch (error) {
        this.error = 'Failed to fetch resources'
        console.error('Error fetching resources:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async createResource(dto: CreateResourceDto, file: File): Promise<ResourceResponseDto> {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', dto.title)
      formData.append('tag', dto.tag)
      if (dto.description) formData.append('description', dto.description)

      const response = await apiClient.post<ResourceResponseDto>('/resources', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      this.resources.unshift(response.data)
      return response.data
    },

    async updateResource(id: string, dto: UpdateResourceDto): Promise<ResourceResponseDto> {
      const response = await apiClient.patch<ResourceResponseDto>(`/resources/${id}`, dto)
      const index = this.resources.findIndex((r) => r.id === id)
      if (index > -1) this.resources[index] = response.data
      return response.data
    },

    async replaceFile(id: string, file: File): Promise<ResourceResponseDto> {
      const formData = new FormData()
      formData.append('file', file)

      const response = await apiClient.post<ResourceResponseDto>(`/resources/${id}/replace`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const index = this.resources.findIndex((r) => r.id === id)
      if (index > -1) this.resources[index] = response.data
      return response.data
    },

    async getVersions(id: string): Promise<ResourceVersionDto[]> {
      const response = await apiClient.get<ResourceVersionDto[]>(`/resources/${id}/versions`)
      return response.data
    },

    async getDownloadUrl(id: string): Promise<string> {
      const response = await apiClient.get<{ url: string }>(`/resources/${id}/download`)
      return response.data.url
    },

    async getVersionDownloadUrl(id: string, versionId: string): Promise<string> {
      const response = await apiClient.get<{ url: string }>(
        `/resources/${id}/versions/${versionId}/download`,
      )
      return response.data.url
    },

    async deleteResource(id: string): Promise<void> {
      await apiClient.delete(`/resources/${id}`)
      this.resources = this.resources.filter((r) => r.id !== id)
    },
  },
})
