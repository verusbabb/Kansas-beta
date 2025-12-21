import { onErrorCaptured } from 'vue'
import { useToastStore } from '@/stores/toast'

/**
 * Global error handler composable
 * Use this in App.vue to catch unhandled errors
 */
export function useErrorHandler() {
  const toastStore = useToastStore()

  onErrorCaptured((err: unknown, _instance, info) => {
    console.error('Unhandled error:', err, info)

    let message = 'An unexpected error occurred'

    if (err instanceof Error) {
      message = err.message
    } else if (typeof err === 'string') {
      message = err
    }

    toastStore.showError(message)

    // Return false to prevent the error from propagating
    return false
  })
}

/**
 * Handle promise rejections globally
 */
export function setupGlobalErrorHandling() {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason)
    
    const toastStore = useToastStore()
    let message = 'An unexpected error occurred'

    if (event.reason instanceof Error) {
      message = event.reason.message
    } else if (typeof event.reason === 'string') {
      message = event.reason
    }

    toastStore.showError(message)
    
    // Prevent default browser error handling
    event.preventDefault()
  })

  // Handle general errors
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error)
    
    const toastStore = useToastStore()
    const message = event.error?.message || 'An unexpected error occurred'
    toastStore.showError(message)
  })
}

