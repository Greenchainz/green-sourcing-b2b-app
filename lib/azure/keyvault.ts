import { SecretClient } from "@azure/keyvault-secrets";
import { getAzureCredential } from "./credentials";

// Use centralized credential with User-Assigned Managed Identity
const credential = getAzureCredential();

const vaultName = process.env.AZURE_KEY_VAULT_NAME;
const url = `https://${vaultName}.vault.azure.net`;

const client = new SecretClient(url, credential);

export async function getSecret(secretName: string) {
  try {
    const secret = await client.getSecret(secretName);
    return secret.value;
  } catch (error) {
    console.error(`Error fetching secret ${secretName}:`, error);
    return null;
  }
}
