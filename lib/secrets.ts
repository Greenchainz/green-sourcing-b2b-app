/**
 * Azure Key Vault Secrets Loader with Managed Identity
 * NODE RUNTIME ONLY — never import from middleware.ts or edge API routes
 */

// Guard: fail fast if accidentally bundled into Edge runtime
if (typeof process === 'undefined' || !process.version) {
  throw new Error('[secrets.ts] Must run in Node.js runtime only');
}

import { SecretClient } from "@azure/keyvault-secrets";
import { ManagedIdentityCredential } from "@azure/identity";




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

  // Resolve vault URL: prefer explicit full URL, then vault name, then canonical default
  const vaultUrl =
    (process.env.AZURE_KEY_VAULT_URL || "").replace(/\/$/, "") ||
    `https://${process.env.KEY_VAULT_NAME || "Greenchainz-vault"}.vault.azure.net`;

  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    try {
      // Uses User-Assigned Managed Identity: id-greenchainz-backend
      // Accept either AZURE_MI_CLIENT_ID (canonical) or MANAGED_IDENTITY_CLIENT_ID (legacy alias)
      const miClientId =
        process.env.AZURE_MI_CLIENT_ID || process.env.MANAGED_IDENTITY_CLIENT_ID;
      if (!miClientId) {
        throw new Error(
          "[Secrets] AZURE_MI_CLIENT_ID (or MANAGED_IDENTITY_CLIENT_ID) env var is required in production"
        );
      }
      const credential = new ManagedIdentityCredential(miClientId);
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
        // "microsoft-client-secret" is the canonical production vault key for the
        // Azure AD / Entra ID client secret (App Registration client secret).
        // The old "AZURE-AD-CLIENT-SECRET" key has been removed from the vault;
        // if you ever need to re-create it, update this entry instead of adding
        // a second mapping — duplicate keys both writing AZURE_AD_CLIENT_SECRET
        // caused the first entry to be silently overwritten at runtime.
        // NOTE: AZURE_AD_CLIENT_ID and AZURE_AD_TENANT_ID are NOT secrets —
        // they are public OAuth identifiers. Set them as plain Container App env vars.
        "microsoft-client-secret": "AZURE_AD_CLIENT_SECRET",
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
        // EC3 / Building Transparency (EPD data pipeline)
        "EC3-API-KEY": "EC3_API_KEY",
        "EC3-CLIENT-ID": "EC3_CLIENT_ID",
        "EC3-CLIENT-SECRET": "EC3_CLIENT_SECRET",
        "EC3-USERNAME": "EC3_USERNAME",
        "EC3-PASSWORD": "EC3_PASSWORD",
        // Autodesk SDA (Sustainable Design API)
        "AUTODESK-CLIENT-ID": "AUTODESK_CLIENT_ID",
        "AUTODESK-CLIENT-SECRET": "AUTODESK_CLIENT_SECRET",
        // Intercom (Messenger identity verification)
        "INTERCOM-SECRET": "INTERCOM_SECRET",
        // FRED Economic Data API (market data for material pricing)
        "fred-api-key": "FRED_API_KEY",
        // Resend (transactional email)
        "resend-api-key": "RESEND_API_KEY",
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
          const errMsg = error instanceof Error ? error.message : String(error);
          console.warn(`[Secrets] ⚠️  Could not load ${vaultKey}: ${errMsg}`);
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
    "JWT_SECRET",
  ];

  const missing = requiredSecrets.filter((key) => !getSecret(key));

  if (missing.length > 0) {
    console.error("[Secrets] ❌ Missing required secrets:", missing);
    return false;
  }

  console.log("[Secrets] ✅ All required secrets are present");
  return true;
}
