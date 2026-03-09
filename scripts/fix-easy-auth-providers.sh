#!/usr/bin/env bash
# ============================================================================
# fix-easy-auth-providers.sh
#
# Fixes the three failed provider configurations from enable-easy-auth.sh.
#
# Root cause: The initial script tried to pull secrets from Key Vault as raw
# values, but the Container App already has secrets registered by name
# (pointing to Key Vault via Managed Identity). The az containerapp auth
# commands need --client-secret-name (the Container App secret name), NOT
# --client-secret (a raw value).
#
# Container App secrets already registered (from `az containerapp secret list`):
#   microsoft-client-secret  → KV: microsoft-client-secret
#   google-client-secret     → KV: GOOGLE-SECRET
#   linkedin-client-secret   → (empty — needs value set)
#   google-client-id         → KV: GOOGLE-CLIENTID
#   azure-ad-client-id       → KV: azure-ad-client-id
#   azure-ad-client-secret   → KV: azure-ad-client-secret
#   azure-ad-tenant-id       → KV: azure-ad-tenant-id
#
# Usage:
#   chmod +x scripts/fix-easy-auth-providers.sh
#   ./scripts/fix-easy-auth-providers.sh
# ============================================================================

set -euo pipefail

RESOURCE_GROUP="rg-greenchainz-prod-container"
CONTAINER_APP="greenchainz-frontend"
KEY_VAULT="greenchainz-vault"

ENTRA_APP_ID="479e2a01-70ab-4df9-baa4-560d317c3423"
ENTRA_TENANT_ID="ca4f78d4-c753-4893-9cd8-1b309922b4dc"
GOOGLE_CLIENT_ID="856406055657-actjkcr6fd9hpvq6b0a7harehqscgj9d.apps.googleusercontent.com"
LINKEDIN_CLIENT_ID="77lzd3h7nzedke"
LINKEDIN_OIDC_METADATA="https://www.linkedin.com/oauth/.well-known/openid-configuration"

echo "═══════════════════════════════════════════════════════════════════"
echo "  GreenChainz Easy Auth — Provider Fix"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# ── Fix 1: Microsoft Entra ID ─────────────────────────────────────────────────
# Use --client-secret-name (Container App secret name) not --client-secret
echo "🔵 Fix 1: Configuring Microsoft Entra ID..."
az containerapp auth microsoft update \
  --name "$CONTAINER_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --client-id "$ENTRA_APP_ID" \
  --client-secret-name "microsoft-client-secret" \
  --tenant-id "$ENTRA_TENANT_ID" \
  --issuer "https://login.microsoftonline.com/${ENTRA_TENANT_ID}/v2.0" \
  --yes \
  && echo "   ✅ Microsoft Entra ID configured" \
  || echo "   ❌ Failed — see error above"

echo ""

# ── Fix 2: Google ─────────────────────────────────────────────────────────────
# Use --client-secret-name (Container App secret name) not --client-secret
# The client ID must be the raw value (not the env var name)
echo "🔴 Fix 2: Configuring Google..."
az containerapp auth google update \
  --name "$CONTAINER_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --client-id "$GOOGLE_CLIENT_ID" \
  --client-secret-name "google-client-secret" \
  --scopes "openid" "profile" "email" \
  --yes \
  && echo "   ✅ Google configured" \
  || echo "   ❌ Failed — see error above"

echo ""

# ── Fix 3: LinkedIn (Custom OIDC) ─────────────────────────────────────────────
# Step 3a: Get the LinkedIn client secret from Key Vault and store it in the
# Container App secret (the existing linkedin-client-secret entry is empty)
echo "🔷 Fix 3: Configuring LinkedIn..."

echo "   Fetching LinkedIn client secret from Key Vault..."
LINKEDIN_SECRET=$(az keyvault secret show \
  --vault-name "$KEY_VAULT" \
  --name "LINKEDIN-SECRET" \
  --query "value" -o tsv 2>/dev/null || echo "")

if [ -z "$LINKEDIN_SECRET" ]; then
  echo "   ❌ Could not retrieve LINKEDIN-SECRET from Key Vault."
  echo "      Add it manually:"
  echo "      az keyvault secret set --vault-name $KEY_VAULT --name LINKEDIN-SECRET --value '<your-linkedin-client-secret>'"
  echo "      Then re-run this script."
else
  # Update the linkedin-client-secret in the Container App with the actual value
  az containerapp secret set \
    --name "$CONTAINER_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --secrets "linkedin-client-secret=$LINKEDIN_SECRET" \
    && echo "   ✅ LinkedIn secret value set in Container App" \
    || echo "   ⚠️  Could not set LinkedIn secret"

  # Now configure LinkedIn as Custom OpenID Connect
  # Try update first (in case it was partially configured), then add
  az containerapp auth openid-connect update \
    --name "$CONTAINER_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --provider-name "linkedin" \
    --client-id "$LINKEDIN_CLIENT_ID" \
    --client-secret-name "linkedin-client-secret" \
    --openid-configuration "$LINKEDIN_OIDC_METADATA" \
    --scopes "openid" "profile" "email" \
    --yes \
    2>/dev/null \
    && echo "   ✅ LinkedIn (OIDC) updated" \
    || {
      az containerapp auth openid-connect add \
        --name "$CONTAINER_APP" \
        --resource-group "$RESOURCE_GROUP" \
        --provider-name "linkedin" \
        --client-id "$LINKEDIN_CLIENT_ID" \
        --client-secret-name "linkedin-client-secret" \
        --openid-configuration "$LINKEDIN_OIDC_METADATA" \
        --scopes "openid" "profile" "email" \
        --yes \
        && echo "   ✅ LinkedIn (OIDC) added" \
        || echo "   ❌ Failed — see error above"
    }
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  Verification — Current auth config:"
echo "═══════════════════════════════════════════════════════════════════"
az containerapp auth show \
  --name "$CONTAINER_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.identityProviders" -o json

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  Test your providers:"
echo "═══════════════════════════════════════════════════════════════════"
FQDN=$(az containerapp show \
  --name "$CONTAINER_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.configuration.ingress.fqdn" -o tsv 2>/dev/null || echo "greenchainz-frontend.jollyrock-a66f2da6.eastus.azurecontainerapps.io")

echo "  Microsoft: https://${FQDN}/.auth/login/aad"
echo "  Google:    https://${FQDN}/.auth/login/google"
echo "  LinkedIn:  https://${FQDN}/.auth/login/linkedin"
echo "  User info: https://${FQDN}/.auth/me"
echo ""
echo "  ⚠️  Still need to add redirect URIs in:"
echo "     Google Cloud Console:   https://${FQDN}/.auth/login/google/callback"
echo "     LinkedIn Dev Portal:    https://${FQDN}/.auth/login/linkedin/callback"
echo ""
echo "  Done! 🎉"
