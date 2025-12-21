import { ref } from 'vue'
import { loadPublicConfig, type PublicConfig } from '@/services/config.service'
import { env } from '@/config/env'

/**
 * Composable for accessing configuration
 * 
 * In development: Uses environment variables directly
 * In production: Can load from backend config endpoint (which uses Secret Manager)
 * 
 * Usage:
 * ```typescript
 * const { config, loading } = useConfig()
 * ```
 */
export function useConfig() {
  const config = ref<PublicConfig>({
    apiUrl: env.apiUrl,
    appName: env.appName,
    environment: env.mode,
  })
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Load config from backend (optional - only if you want runtime config)
   * By default, uses build-time environment variables
   */
  const loadFromBackend = async () => {
    if (env.isDev) {
      // In development, use env vars directly
      return
    }

    loading.value = true
    error.value = null

    try {
      const backendConfig = await loadPublicConfig()
      config.value = backendConfig
    } catch (err: any) {
      error.value = err.message || 'Failed to load configuration'
      console.error('Failed to load config from backend:', err)
      // Continue with env vars as fallback
    } finally {
      loading.value = false
    }
  }

  // Optionally load from backend on mount (uncomment if needed)
  // onMounted(() => {
  //   loadFromBackend()
  // })

  return {
    config,
    loading,
    error,
    loadFromBackend,
  }
}

