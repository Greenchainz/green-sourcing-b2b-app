/**
 * Azure Credentials Factory
 * 
 * Centralized credential management for User-Assigned Managed Identity
 * Identity: id-greenchainz-backend
 * Client ID: ec248abf-f6ce-4d7c-8888-740317709f1b
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
 * AZURE_CLIENT_ID should be set to: ec248abf-f6ce-4d7c-8888-740317709f1b
 * This enables the app to use the id-greenchainz-backend managed identity
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

  const managedIdentityClientId = process.env.AZURE_CLIENT_ID;

  if (!managedIdentityClientId) {
    console.warn(
      '⚠️ AZURE_CLIENT_ID not set. Managed Identity authentication may fail in Azure. ' +
      'Set AZURE_CLIENT_ID=ec248abf-f6ce-4d7c-8888-740317709f1b for production.'
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
  return !!process.env.AZURE_CLIENT_ID;
}
