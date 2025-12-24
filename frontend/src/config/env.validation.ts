/**
 * Environment variable validation for frontend
 * 
 * Note: Frontend environment variables are:
 * - Baked into the build at build time (not runtime)
 * - Exposed to the browser (never store sensitive secrets here)
 * - Must be prefixed with VITE_ to be accessible
 */

interface EnvConfig {
  apiUrl: string
  appName: string
  appVersion: string
  auth0Domain?: string
  auth0ClientId?: string
  mode: string
  isDev: boolean
  isProd: boolean
}

/**
 * Validate and get environment configuration
 */
export function getEnvConfig(): EnvConfig {
  const apiUrl = import.meta.env.VITE_API_URL

  if (!apiUrl && import.meta.env.PROD) {
    console.error('VITE_API_URL is required in production')
    throw new Error('VITE_API_URL environment variable is required')
  }

  const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN
  const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID

  return {
    apiUrl: apiUrl || 'http://localhost:3000',
    appName: import.meta.env.VITE_APP_NAME || 'Kansas Beta',
    appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
    auth0Domain,
    auth0ClientId,
    mode: import.meta.env.MODE,
    isDev: import.meta.env.DEV,
    isProd: import.meta.env.PROD,
  }
}

