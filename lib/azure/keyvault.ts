import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";

// This automatically uses your VS Code login (local) or Managed Identity (Azure)
const credential = new DefaultAzureCredential();

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
