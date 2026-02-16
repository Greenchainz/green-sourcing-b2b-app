import { SecretClient } from "@azure/keyvault-secrets";
import { getAzureCredential } from "./credentials";

// Lazy-loaded singleton
let client: SecretClient | null = null;

/**
 * Initialize the Secret Client on first use
 * This prevents DefaultAzureCredential from running in browser/edge contexts
 */
function initializeClient(): SecretClient {
  if (client) {
    return client;
  }

  // Only initialize if we're in a server context
  if (typeof window !== 'undefined') {
    throw new Error(
      '[Azure] Cannot initialize Key Vault client in browser context. ' +
      'This client must only be used in server-side code (API routes, server functions).'
    );
  }

  const credential = getAzureCredential();
  const vaultName = process.env.AZURE_KEY_VAULT_NAME;
  
  if (!vaultName) {
    throw new Error('AZURE_KEY_VAULT_NAME environment variable is not set');
  }

  const url = `https://${vaultName}.vault.azure.net`;
  client = new SecretClient(url, credential);

  return client;
}

export async function getSecret(secretName: string) {
  try {
    const secretClient = initializeClient();
    const secret = await secretClient.getSecret(secretName);
    return secret.value;
  } catch (error) {
    console.error(`Error fetching secret ${secretName}:`, error);
    return null;
  }
}
