import apiClient from './api'

/**
 * Public configuration from backend
 * This allows the frontend to get runtime configuration from the backend,
 * which can pull from Secret Manager or environment variables
 */
export interface PublicConfig {
  apiUrl: string
  appName: string
  environment: string
}

let cachedConfig: PublicConfig | null = null

/**
 * Load public configuration from backend
 * Caches the result to avoid repeated calls
 */
export async function loadPublicConfig(): Promise<PublicConfig> {
  if (cachedConfig) {
    return cachedConfig
  }

  try {
    // Try to load from backend config endpoint
    const response = await apiClient.get<PublicConfig>('/config')
    cachedConfig = response.data
    return cachedConfig
  } catch (error) {
    // Fallback to environment variables if backend is unavailable
    console.warn('Failed to load config from backend, using environment variables')
    const { env } = await import('@/config/env')
    
    cachedConfig = {
      apiUrl: env.apiUrl,
      appName: env.appName,
      environment: env.mode,
    }
    
    return cachedConfig
  }
}

/**
 * Get cached config (synchronous)
 * Returns null if not loaded yet - call loadPublicConfig() first
 */
export function getPublicConfig(): PublicConfig | null {
  return cachedConfig
}

