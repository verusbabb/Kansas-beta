/**
 * Secret Loader - Unified secrets management
 * 
 * This module loads secrets from GCP Secret Manager when enabled,
 * with automatic fallback to environment variables (.env files).
 * 
 * Works in both local development and production:
 * - Local: Set GCP_SECRET_MANAGER_ENABLED=true and authenticate with gcloud
 * - Production: Automatically uses Secret Manager when enabled
 */

import { loadSecrets } from './gcp-secret-manager';

/**
 * Mapping of secret names in Secret Manager to environment variable names
 * Add new secrets here as you create them in Secret Manager
 */
const SECRET_MAPPINGS: Record<string, string> = {
  // Database secrets
  'database-password': 'DATABASE_PASSWORD',
  'database-user': 'DATABASE_USER',
  
  // JWT secrets
  'jwt-secret': 'JWT_SECRET',
  
  // Auth0 secrets
  'auth0-domain': 'AUTH0_DOMAIN',
  'auth0-audience': 'AUTH0_AUDIENCE',
  
  // User management
  'master-user-emails': 'MASTER_USER_EMAILS',
  
  // Add more mappings as needed
  // 'api-key': 'API_KEY',
  // 'third-party-secret': 'THIRD_PARTY_SECRET',
};

/**
 * Load secrets from GCP Secret Manager and set them as environment variables
 * This allows the rest of the app to use them via ConfigService as normal
 * 
 * @param projectId - GCP Project ID
 * @param secretNames - Optional list of specific secrets to load (defaults to all in SECRET_MAPPINGS)
 * @returns Object with loaded secrets
 */
export async function loadSecretsFromManager(
  projectId: string,
  secretNames?: string[],
): Promise<Record<string, string>> {
  const secretsToLoad = secretNames || Object.keys(SECRET_MAPPINGS);
  
  try {
    const secrets = await loadSecrets(secretsToLoad, projectId);
    
    // Set as environment variables so ConfigService can pick them up
    for (const [secretName, secretValue] of Object.entries(secrets)) {
      if (secretValue) {
        const envVarName = SECRET_MAPPINGS[secretName];
        if (envVarName) {
          process.env[envVarName] = secretValue;
        }
      }
    }
    
    return secrets;
  } catch (error) {
    console.error('Failed to load secrets from Secret Manager:', error);
    throw error;
  }
}

/**
 * Initialize secrets - loads from Secret Manager if enabled, otherwise uses .env
 * 
 * @param projectId - GCP Project ID (optional)
 * @param enabled - Whether Secret Manager is enabled
 */
export async function initializeSecrets(
  projectId?: string,
  enabled = false,
): Promise<void> {
  if (!enabled || !projectId) {
    return;
  }

  try {
    await loadSecretsFromManager(projectId);
  } catch (error) {
    // Don't throw - allow fallback to .env files
    // In production, you might want to throw here to fail fast
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Failed to load secrets from Secret Manager in production');
    }
  }
}

