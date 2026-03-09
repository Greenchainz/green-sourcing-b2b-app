/**
 * Azure Key Vault Secrets Loader with Managed Identity
 *
 * Production: Uses Managed Identity (id-greenchainz-backend) to pull secrets
 *             from greenchainz-vault — zero secrets in code or env vars.
 * Local Dev:  Falls back to .env.local for convenience.
 *
 * This module MUST be called at server startup (server/_core/index.ts)
 * before any module that reads auth credentials (better-auth, DB, etc.).
 */

import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";

// Cache for secrets to avoid repeated Key Vault calls
const secretsCache: Record<string, string> = {};
let secretsLoaded = false;

/**
 * Load secrets from Azure Key Vault using Managed Identity.
 * Falls back to process.env if Key Vault is not available (local dev).
 */
export async function loadSecrets(): Promise<void> {
  if (secretsLoaded) {
    return; // Already loaded — idempotent
  }

  // Skip Key Vault access during build time (Managed Identity not available)
  const isBuildTime =
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build";

  if (isBuildTime) {
    console.log("[Secrets] Skipping Key Vault during build time");
    secretsLoaded = true;
    return;
  }

  const keyVaultName = process.env.KEY_VAULT_NAME || "greenchainz-vault";
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    try {
      // Uses User-Assigned Managed Identity: id-greenchainz-backend
      // AZURE_CLIENT_ID must be set to: ec248abf-f6ce-4d7c-8888-740317709f1b
      const credential = new DefaultAzureCredential();
      const vaultUrl = `https://${keyVaultName}.vault.azure.net`;
      const client = new SecretClient(vaultUrl, credential);

      console.log(`[Secrets] Loading secrets from Key Vault: ${vaultUrl}`);

      // ── Key Vault secret name → process.env variable name ──────────────────
      // Key Vault names use hyphens (Azure naming convention).
      // Env var names use underscores (Node.js convention).
      const secretMappings: Record<string, string> = {
        // JWT session signing
        "jwt-secret": "JWT_SECRET",
        // better-auth
        "AUTH-SECRET": "AUTH_SECRET",
        "BETTER-AUTH-URL": "BETTER_AUTH_URL",
        // Microsoft Entra ID (user login + Marketplace API)
        "AZURE-AD-CLIENT-ID": "AZURE_AD_CLIENT_ID",
        "AZURE-AD-CLIENT-SECRET": "AZURE_AD_CLIENT_SECRET",
        "AZURE-AD-TENANT-ID": "AZURE_AD_TENANT_ID",
        // microsoft-client-secret is the real Azure AD client secret
        "microsoft-client-secret": "AZURE_AD_CLIENT_SECRET",
        // Google OAuth
        "GOOGLE-CLIENTID": "GOOGLE_CLIENT_ID",
        "GOOGLE-SECRET": "GOOGLE_CLIENT_SECRET",
        // LinkedIn OAuth
        "LINKEDIN-CLIENTID": "LINKEDIN_CLIENT_ID",
        "LINKEDIN-SECRET": "LINKEDIN_CLIENT_SECRET",
        // Database
        "DATABASE-URL": "DATABASE_URL",
        // Email (Zeptomail SMTP — transactional, dedicated IPs)
        // Username is always the literal "emailapikey" but stored in KV for consistency
        "ZEPTOMAIL-SMTP-USER": "ZEPTOMAIL_SMTP_USER",
        "ZEPTOMAIL-SMTP-PASSWORD": "ZEPTOMAIL_SMTP_PASSWORD",
        // App URLs
        "FRONTEND-URL": "FRONTEND_URL",
        // Azure Web PubSub (real-time messaging)
        "WEBPUBSUB-CONNECTION-STRING": "AZURE_WEBPUBSUB_CONNECTION_STRING",
        // Azure Maps (geocoding for supplier matching)
        // NOTE: azure-maps.ts reads AZURE_MAPS_SUBSCRIPTION_KEY — must match exactly
        "AZURE-MAPS-KEY": "AZURE_MAPS_SUBSCRIPTION_KEY",
        // Azure Redis Cache (caching + rate limiting)
        "REDIS-HOST": "REDIS_HOST",
        "REDIS-PORT": "REDIS_PORT",
      };

      for (const [vaultKey, envKey] of Object.entries(secretMappings)) {
        try {
          const secret = await client.getSecret(vaultKey);
          if (secret.value) {
            secretsCache[envKey] = secret.value;
            process.env[envKey] = secret.value;
            console.log(`[Secrets] ✅ Loaded ${envKey}`);
          }
        } catch (error) {
          // Non-fatal: log and continue — app may still work if env var is set
          console.warn(`[Secrets] ⚠️  Could not load ${vaultKey} from Key Vault`);
        }
      }

      secretsLoaded = true;
      console.log("[Secrets] Key Vault load complete");
    } catch (error) {
      console.error("[Secrets] Failed to connect to Key Vault:", error);
      console.warn("[Secrets] Falling back to environment variables");
      secretsLoaded = true;
    }
  } else {
    // Development: use .env.local — no Key Vault needed
    console.log("[Secrets] Development mode — using .env.local");
    secretsLoaded = true;
  }
}

/**
 * Get a secret value (from cache or environment variable).
 * Always prefer this over process.env directly.
 */
export function getSecret(key: string): string | undefined {
  return secretsCache[key] || process.env[key];
}

/**
 * Validate that all required secrets are available.
 * Call after loadSecrets() to confirm the app is properly configured.
 */
export function validateSecrets(): boolean {
  // With Easy Auth enabled, OAuth client secrets are managed by the Azure
  // Container Apps sidecar — we no longer need them in our process.env.
  // Only DATABASE_URL and JWT_SECRET (for legacy session compat) are required.
  const requiredSecrets = [
    "DATABASE_URL",
  ];

  const missing = requiredSecrets.filter((key) => !getSecret(key));

  if (missing.length > 0) {
    console.error("[Secrets] ❌ Missing required secrets:", missing);
    return false;
  }

  console.log("[Secrets] ✅ All required secrets are present");
  return true;
}
