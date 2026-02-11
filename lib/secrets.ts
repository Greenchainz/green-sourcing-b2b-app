/**
 * Azure Key Vault Secrets Loader with Managed Identity
 * 
 * Production: Uses Managed Identity to access Key Vault (no secrets in code)
 * Local Dev: Falls back to .env.local for convenience
 */

import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";

// Cache for secrets to avoid repeated Key Vault calls
const secretsCache: Record<string, string> = {};
let secretsLoaded = false;

/**
 * Load secrets from Azure Key Vault using Managed Identity
 * Falls back to process.env if Key Vault is not available (local dev)
 */
export async function loadSecrets(): Promise<void> {
  if (secretsLoaded) {
    return; // Already loaded
  }

  // Skip Key Vault access during build time (Managed Identity not available)
  const isBuildTime = process.env.NEXT_PHASE === "phase-production-build" || 
                      process.env.npm_lifecycle_event === "build";
  
  if (isBuildTime) {
    console.log("[Secrets] Skipping Key Vault during build time");
    secretsLoaded = true;
    return;
  }

  const keyVaultName = process.env.KEY_VAULT_NAME || "greenchainz-vault";
  const isProduction = process.env.NODE_ENV === "production";

  // In production, load from Key Vault using Managed Identity
  if (isProduction) {
    try {
      const credential = new DefaultAzureCredential();
      const vaultUrl = `https://${keyVaultName}.vault.azure.net`;
      const client = new SecretClient(vaultUrl, credential);

      console.log(`[Secrets] Loading secrets from Key Vault: ${vaultUrl}`);

      // Map of Key Vault secret names to environment variable names
      const secretMappings: Record<string, string> = {
        "NEXTAUTH-SECRET": "NEXTAUTH_SECRET",
        "AZURE-AD-CLIENT-ID": "MICROSOFT_CLIENT_ID",
        "AZURE-AD-CLIENT-SECRET": "MICROSOFT_CLIENT_SECRET",
        "AZURE-AD-TENANT-ID": "MICROSOFT_TENANT_ID",
        "GOOGLE-CLIENTID": "GOOGLE_CLIENT_ID",
        "GOOGLE-SECRET": "GOOGLE_CLIENT_SECRET",
        "LINKEDIN-CLIENTID": "LINKEDIN_CLIENT_ID",
        "LINKEDIN-SECRET": "LINKEDIN_CLIENT_SECRET",
      };

      // Load each secret from Key Vault
      for (const [vaultKey, envKey] of Object.entries(secretMappings)) {
        try {
          const secret = await client.getSecret(vaultKey);
          if (secret.value) {
            secretsCache[envKey] = secret.value;
            process.env[envKey] = secret.value;
            console.log(`[Secrets] Loaded ${envKey} from Key Vault`);
          }
        } catch (error) {
          console.error(`[Secrets] Failed to load ${vaultKey}:`, error);
        }
      }

      secretsLoaded = true;
      console.log("[Secrets] All secrets loaded from Key Vault");
    } catch (error) {
      console.error("[Secrets] Failed to connect to Key Vault:", error);
      console.warn("[Secrets] Falling back to environment variables");
    }
  } else {
    // In development, use .env.local
    console.log("[Secrets] Using .env.local for local development");
    secretsLoaded = true;
  }
}

/**
 * Get a secret value (from cache or environment)
 */
export function getSecret(key: string): string | undefined {
  return secretsCache[key] || process.env[key];
}

/**
 * Check if all required secrets are available
 */
export function validateSecrets(): boolean {
  const requiredSecrets = [
    "NEXTAUTH_SECRET",
    "MICROSOFT_CLIENT_ID",
    "MICROSOFT_CLIENT_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "LINKEDIN_CLIENT_ID",
    "LINKEDIN_CLIENT_SECRET",
  ];

  const missing = requiredSecrets.filter((key) => !getSecret(key));

  if (missing.length > 0) {
    console.error("[Secrets] Missing required secrets:", missing);
    return false;
  }

  return true;
}
