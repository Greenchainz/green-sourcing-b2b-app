// lib/azure/identity-client.ts
import { SecretClient } from '@azure/keyvault-secrets';
import { AppConfigurationClient } from '@azure/app-configuration';
import { getAzureCredential } from './credentials';

/**
 * Lazy-loaded singleton instances
 * These are only initialized when first used, preventing browser/edge execution errors
 */
let credential: ReturnType<typeof getAzureCredential> | null = null;
let secretClient: SecretClient | null = null;
let appConfigClient: AppConfigurationClient | null = null;

/**
 * Initialize Azure clients on first use (lazy loading)
 * This prevents DefaultAzureCredential from running in browser/edge contexts
 */
function initializeClients() {
  if (credential && secretClient && appConfigClient) {
    return; // Already initialized
  }

  // Only initialize if we're in a server context
  if (typeof window !== 'undefined') {
    throw new Error(
      '[Azure] Cannot initialize Azure clients in browser context. ' +
      'These clients must only be used in server-side code (API routes, server functions).'
    );
  }

  credential = getAzureCredential();

  // Key Vault client
  const keyVaultName = process.env.KEY_VAULT_NAME || 'greenchainz-vault';
  const keyVaultUrl = `https://${keyVaultName}.vault.azure.net`;
  secretClient = new SecretClient(keyVaultUrl, credential);

  // App Configuration client
  const appConfigEndpoint =
    process.env.APP_CONFIG_ENDPOINT || 'https://app-config-green.azconfig.io';
  appConfigClient = new AppConfigurationClient(appConfigEndpoint, credential);
}

/**
 * Retrieve secret from Key Vault
 * @param name Secret name (e.g., "db-connection-string")
 * @returns Secret value
 */
export async function getSecret(name: string): Promise<string> {
  try {
    initializeClients();
    if (!secretClient) {
      throw new Error('Secret client not initialized');
    }
    const result = await secretClient.getSecret(name);
    if (!result.value) {
      throw new Error(`Secret "${name}" has no value`);
    }
    return result.value;
  } catch (error) {
    console.error(`[Azure] Failed to retrieve secret "${name}":`, error);
    throw error;
  }
}

/**
 * Retrieve configuration value from App Configuration
 * @param key Configuration key (e.g., "FeatureFlags:RFQEnabled")
 * @returns Configuration value
 */
export async function getConfigValue(key: string): Promise<string> {
  try {
    initializeClients();
    if (!appConfigClient) {
      throw new Error('App config client not initialized');
    }
    const setting = await appConfigClient.getConfigurationSetting({ key });
    if (!setting.value) {
      throw new Error(`Config key "${key}" has no value`);
    }
    return setting.value;
  } catch (error) {
    console.error(`[Azure] Failed to retrieve config "${key}":`, error);
    throw error;
  }
}

/**
 * Health check for Azure dependencies
 * Returns connectivity status for Key Vault and App Config
 */
export async function azureHealthCheck(): Promise<{
  keyVault: boolean;
  appConfig: boolean;
}> {
  const result = {
    keyVault: false,
    appConfig: false,
  };

  // Check Key Vault access
  try {
    initializeClients();
    if (!secretClient) {
      throw new Error('Secret client not initialized');
    }
    const iterator = secretClient.listPropertiesOfSecrets();
    await iterator.next();
    result.keyVault = true;
  } catch (error) {
    console.error('[Azure] Key Vault health check failed:', error);
  }

  // Check App Config access
  try {
    initializeClients();
    if (!appConfigClient) {
      throw new Error('App config client not initialized');
    }
    const iterator = appConfigClient.listConfigurationSettings();
    await iterator.next();
    result.appConfig = true;
  } catch (error) {
    console.error('[Azure] App Config health check failed:');
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown');
    console.error('Full error:', error);
  }

  return result;
}

/**
 * Get initialized clients (for advanced use cases)
 * Only call from server-side code
 */
export function getClients() {
  initializeClients();
  return {
    credential: credential!,
    secretClient: secretClient!,
    appConfigClient: appConfigClient!,
  };
}
