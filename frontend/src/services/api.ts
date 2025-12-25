import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'
import { env } from '@/config/env'
import { useToastStore } from '@/stores/toast'

/**
 * Token getter function - set by auth store
 * This allows the API client to get tokens without directly importing Auth0
 */
let tokenGetter: (() => Promise<string | null>) | null = null

/**
 * Set the token getter function
 * Called by auth store on initialization
 */
export function setTokenGetter(getter: () => Promise<string | null>) {
  tokenGetter = getter
}

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
 * Adds Auth0 access token to requests when available
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Get access token if token getter is available
    if (tokenGetter) {
      try {
        const token = await tokenGetter()
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`
          
          // Debug: Log what token is being sent (first/last chars only)
          if (import.meta.env.DEV) {
            const isJWT = token.split('.').length === 3
            console.debug('Adding token to request', {
              url: config.url,
              tokenLength: token.length,
              tokenPreview: `${token.substring(0, 20)}...${token.substring(token.length - 20)}`,
              isJWT,
            })
            
            // Try to decode to verify it's a valid JWT with audience
            if (isJWT) {
              try {
                const payload = JSON.parse(atob(token.split('.')[1]))
                console.debug('Token being sent has:', {
                  aud: payload.aud,
                  iss: payload.iss,
                  sub: payload.sub?.substring(0, 20) + '...',
                })
              } catch (e) {
                console.warn('Could not decode token payload')
              }
            } else {
              console.warn('⚠️ Token does not appear to be a JWT!')
            }
          }
        } else {
          if (import.meta.env.DEV) {
            console.debug('No token available for request', { url: config.url })
          }
        }
      } catch (error) {
        // Token fetch failed - continue without token (for public endpoints)
        console.warn('Could not get access token:', error)
      }
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

