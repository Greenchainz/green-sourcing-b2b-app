/**
 * Azure Credentials Factory
 * 
 * Centralized credential management for User-Assigned Managed Identity
 * Identity: id-greenchainz-backend
 * Client ID: fbfc75a8-97d1-4c3d-9236-fe1d2fe86d3e
 * 
 * This module provides a singleton credential instance that:
 * - Uses User-Assigned Managed Identity in Azure (production)
 * - Falls back to developer credentials locally (VS Code, Azure CLI)
 * - Enforces Zero Trust security patterns
 */

import { DefaultAzureCredential } from '@azure/identity';

/**
 * Singleton credential instance with User-Assigned Managed Identity
 *
 * MANAGED_IDENTITY_CLIENT_ID should be set to: fbfc75a8-97d1-4c3d-9236-fe1d2fe86d3e
 * This enables the app to use the id-greenchainz-backend managed identity.
 *
 * NOTE: MANAGED_IDENTITY_CLIENT_ID is the user-assigned managed identity client ID.
 * It is NOT the same as the Entra app registration CLIENT_ID used for user sign-in.
 */
let credential: DefaultAzureCredential | null = null;

/**
 * Get or create the Azure credential with proper managed identity configuration
 *
 * @returns DefaultAzureCredential configured for User-Assigned Managed Identity
 */
export function getAzureCredential(): DefaultAzureCredential {
  if (credential) {
    return credential;
  }

  // Accept AZURE_MI_CLIENT_ID (canonical) or MANAGED_IDENTITY_CLIENT_ID (legacy alias)
  const managedIdentityClientId =
    process.env.AZURE_MI_CLIENT_ID || process.env.MANAGED_IDENTITY_CLIENT_ID;

  if (!managedIdentityClientId) {
    console.warn(
      '⚠️ AZURE_MI_CLIENT_ID not set. Managed Identity authentication may fail in Azure. ' +
      'Set AZURE_MI_CLIENT_ID=fbfc75a8-97d1-4c3d-9236-fe1d2fe86d3e for production. ' +
      'Do NOT use the Entra app registration CLIENT_ID here — they are different identities.'
    );
  }

  credential = new DefaultAzureCredential({
    managedIdentityClientId: managedIdentityClientId,
  });

  console.log('✅ Azure credential initialized with User-Assigned Managed Identity');
  return credential;
}

/**
 * Reset the credential (useful for testing)
 */
export function resetAzureCredential(): void {
  credential = null;
}

/**
 * Validate that the credential is properly configured
 * @returns true if configuration is valid
 */
export function isCredentialConfigured(): boolean {
  if (process.env.AZURE_MI_CLIENT_ID || process.env.MANAGED_IDENTITY_CLIENT_ID) {
    return true;
  }

  // System-assigned managed identity has no client-id env var but is still valid in Azure.
  return process.env.NODE_ENV === "production";
}
