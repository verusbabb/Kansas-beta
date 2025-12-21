/**
 * Type-safe environment configuration
 * 
 * IMPORTANT: Frontend environment variables are:
 * - Baked into the build at BUILD TIME (not runtime)
 * - Exposed to the browser (NEVER store sensitive secrets here)
 * - Must be prefixed with VITE_ to be accessible
 * 
 * For GCP deployment, set these during the build process.
 */
import { getEnvConfig } from './env.validation'

// Validate and get environment configuration
export const env = getEnvConfig()

export type Env = typeof env

