/**
 * GCP Secret Manager Integration
 * 
 * This module provides utilities to fetch secrets from GCP Secret Manager.
 * 
 * Usage (works in both local and production):
 * 1. Store secrets in GCP Secret Manager
 * 2. Set GCP_SECRET_MANAGER_ENABLED=true
 * 3. Set GCP_PROJECT_ID
 * 4. Authenticate with GCP (gcloud auth application-default login for local)
 * 5. Secrets will be automatically loaded
 * 
 * Falls back to .env files if Secret Manager is disabled or unavailable.
 */

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

let secretClient: SecretManagerServiceClient | null = null;

/**
 * Initialize Secret Manager client
 */
export function initSecretManager(projectId: string): SecretManagerServiceClient {
  if (!secretClient) {
    secretClient = new SecretManagerServiceClient({
      projectId,
    });
  }
  return secretClient;
}

/**
 * Get secret from GCP Secret Manager
 * 
 * @param secretName - Name of the secret (e.g., 'database-password')
 * @param projectId - GCP Project ID
 * @returns Secret value as string
 */
export async function getSecret(
  secretName: string,
  projectId: string,
): Promise<string> {
  const client = initSecretManager(projectId);
  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;

  try {
    const [version] = await client.accessSecretVersion({ name });
    const secretValue = version.payload?.data?.toString();
    
    if (!secretValue) {
      throw new Error(`Secret ${secretName} is empty`);
    }

    return secretValue;
  } catch (error) {
    throw new Error(`Failed to fetch secret ${secretName}: ${error}`);
  }
}

/**
 * Load multiple secrets from Secret Manager
 * 
 * @param secretNames - Array of secret names to load
 * @param projectId - GCP Project ID
 * @returns Object with secret names as keys and values as values
 */
export async function loadSecrets(
  secretNames: string[],
  projectId: string,
): Promise<Record<string, string>> {
  const secrets: Record<string, string> = {};

  await Promise.all(
    secretNames.map(async (secretName) => {
      try {
        secrets[secretName] = await getSecret(secretName, projectId);
      } catch (error: any) {
        // Check if it's a NOT_FOUND error (secret doesn't exist)
        if (error?.message?.includes('NOT_FOUND') || error?.code === 5) {
          console.warn(`⚠ Secret ${secretName} not found in Secret Manager, skipping`);
        } else {
          // For other errors, log but don't throw (allows other secrets to load)
          console.error(`⚠ Failed to load secret ${secretName}:`, error.message || error);
        }
        // Don't throw - allow other secrets to load
      }
    }),
  );

  return secrets;
}

