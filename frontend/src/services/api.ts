import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'
import { env } from '@/config/env'
import { useToastStore } from '@/stores/toast'

/**
 * Create and configure Axios instance
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Request interceptor
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add auth token if available (for future use)
    const token = localStorage.getItem('auth_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Add request ID for tracing
    config.headers['X-Request-ID'] = crypto.randomUUID()

    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

/**
 * Response interceptor
 */
apiClient.interceptors.response.use(
  (response) => {
    // Return response data directly
    return response
  },
  (error: AxiosError) => {
    const toastStore = useToastStore()
    
    // Skip showing toast for health check errors - handled by health store
    const isHealthCheck = error.config?.url?.includes('/health')

    // Handle different error types
    if (error.response) {
      // Server responded with error status
      const status = error.response.status
      const data = error.response.data as any

      let message = 'An error occurred'

      if (data?.message) {
        message = Array.isArray(data.message) ? data.message.join(', ') : data.message
      } else if (data?.error) {
        message = data.error
      } else {
        // Default messages based on status
        switch (status) {
          case 400:
            message = 'Bad request. Please check your input.'
            break
          case 401:
            message = 'Unauthorized. Please log in.'
            // Could redirect to login here
            break
          case 403:
            message = 'Forbidden. You do not have permission.'
            break
          case 404:
            message = 'Resource not found.'
            break
          case 422:
            message = 'Validation error. Please check your input.'
            break
          case 429:
            message = 'Too many requests. Please try again later.'
            break
          case 500:
            message = 'Server error. Please try again later.'
            break
          case 503:
            message = 'Service unavailable. Please try again later.'
            break
          default:
            message = `Error ${status}: ${error.response.statusText || 'Unknown error'}`
        }
      }

      // Show error toast (skip for health checks)
      if (!isHealthCheck) {
        toastStore.showError(message)
      }

      // Log error for debugging
      console.error('API Error:', {
        status,
        message,
        url: error.config?.url,
        data: error.response.data,
      })
    } else if (error.request) {
      // Request was made but no response received
      if (!isHealthCheck) {
        toastStore.showError('Network error. Please check your connection.')
      }
      console.error('Network Error:', error.request)
    } else {
      // Something else happened
      if (!isHealthCheck) {
        toastStore.showError('An unexpected error occurred.')
      }
      console.error('Error:', error.message)
    }

    return Promise.reject(error)
  }
)

export default apiClient

