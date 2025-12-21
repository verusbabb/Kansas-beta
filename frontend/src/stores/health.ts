import { defineStore } from 'pinia'
import apiClient from '@/services/api'
import { useToastStore } from './toast'

interface HealthStatus {
  status: string
  timestamp: string
  uptime: number
}

export const useHealthStore = defineStore('health', {
  actions: {
    async checkHealth(): Promise<HealthStatus> {
      const response = await apiClient.get<HealthStatus>('/health')
      return response.data
    },

    async checkHealthWithToast(): Promise<void> {
      const toastStore = useToastStore()
      
      // Show loading toast immediately
      const loadingToast = toastStore.showLoading(
        'Checking database connection...',
        'Health Check',
        'health-check'
      )

      try {
        await this.checkHealth()
        // Remove loading toast and show success
        if (loadingToast) {
          toastStore.removeToast(loadingToast)
        }
        toastStore.showSuccess('Database connected!', 'Health Check')
      } catch (error) {
        // Remove loading toast and show error
        if (loadingToast) {
          toastStore.removeToast(loadingToast)
        }
        toastStore.showError('Database not connected', 'Health Check')
        console.error('Health check failed:', error)
      }
    }
  }
})

