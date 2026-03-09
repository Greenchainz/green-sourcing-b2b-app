#!/usr/bin/env bash
# ============================================================================
# enable-easy-auth.sh — Configure Azure Container Apps Easy Auth
#
# This script enables the built-in authentication sidecar on the
# greenchainz-frontend Container App with three identity providers:
#   1. Microsoft Entra ID (Azure AD)
#   2. Google
#   3. LinkedIn (via Custom OpenID Connect)
#
# Prerequisites:
#   - Azure CLI installed and logged in (`az login`)
#   - Contributor role on rg-greenchainz-prod-container
#   - Client secrets for each provider stored in Azure Key Vault
#
# Usage:
#   chmod +x scripts/enable-easy-auth.sh
#   ./scripts/enable-easy-auth.sh
# ============================================================================

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
RESOURCE_GROUP="rg-greenchainz-prod-container"
CONTAINER_APP="greenchainz-frontend"
KEY_VAULT="greenchainz-vault"

# Microsoft Entra ID
ENTRA_APP_ID="479e2a01-70ab-4df9-baa4-560d317c3423"
ENTRA_TENANT_ID="ca4f78d4-c753-4893-9cd8-1b309922b4dc"

# Google OAuth
GOOGLE_CLIENT_ID="856406055657-actjkcr6fd9hpvq6b0a7harehqscgj9d.apps.googleusercontent.com"

# LinkedIn OpenID Connect
LINKEDIN_CLIENT_ID="77lzd3h7nzedke"
LINKEDIN_OIDC_METADATA="https://www.linkedin.com/oauth/.well-known/openid-configuration"

# Container App FQDN (for redirect URIs)
APP_FQDN=$(az containerapp show \
  --name "$CONTAINER_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.configuration.ingress.fqdn" -o tsv 2>/dev/null || echo "")

if [ -z "$APP_FQDN" ]; then
  echo "⚠️  Could not detect Container App FQDN. Using greenchainz.com as default."
  APP_FQDN="greenchainz.com"
fi

echo "═══════════════════════════════════════════════════════════════════"
echo "  GreenChainz Easy Auth Configuration"
echo "═══════════════════════════════════════════════════════════════════"
echo "  Container App:  $CONTAINER_APP"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  App FQDN:       $APP_FQDN"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# ── Step 1: Retrieve client secrets from Key Vault ───────────────────────────
echo "📦 Retrieving client secrets from Key Vault: $KEY_VAULT"

ENTRA_CLIENT_SECRET=$(az keyvault secret show \
  --vault-name "$KEY_VAULT" \
  --name "microsoft-client-secret" \
  --query "value" -o tsv 2>/dev/null || echo "")

GOOGLE_CLIENT_SECRET=$(az keyvault secret show \
  --vault-name "$KEY_VAULT" \
  --name "GOOGLE-SECRET" \
  --query "value" -o tsv 2>/dev/null || echo "")

LINKEDIN_CLIENT_SECRET=$(az keyvault secret show \
  --vault-name "$KEY_VAULT" \
  --name "LINKEDIN-SECRET" \
  --query "value" -o tsv 2>/dev/null || echo "")

# Validate secrets
MISSING=0
if [ -z "$ENTRA_CLIENT_SECRET" ]; then
  echo "❌ Missing: microsoft-client-secret in Key Vault"
  MISSING=1
fi
if [ -z "$GOOGLE_CLIENT_SECRET" ]; then
  echo "❌ Missing: GOOGLE-SECRET in Key Vault"
  MISSING=1
fi
if [ -z "$LINKEDIN_CLIENT_SECRET" ]; then
  echo "❌ Missing: LINKEDIN-SECRET in Key Vault"
  MISSING=1
fi

if [ "$MISSING" -eq 1 ]; then
  echo ""
  echo "⚠️  Some secrets are missing. You can add them with:"
  echo "  az keyvault secret set --vault-name $KEY_VAULT --name <secret-name> --value <secret-value>"
  echo ""
  echo "Continuing with available secrets..."
fi

# ── Step 2: Update Entra ID App Registration redirect URIs ───────────────────
echo ""
echo "🔑 Step 1: Updating Microsoft Entra ID app registration..."

# Add Easy Auth callback URI to the app registration
EASY_AUTH_CALLBACK="https://${APP_FQDN}/.auth/login/aad/callback"
CUSTOM_DOMAIN_CALLBACK="https://greenchainz.com/.auth/login/aad/callback"

echo "   Adding redirect URIs:"
echo "     - $EASY_AUTH_CALLBACK"
echo "     - $CUSTOM_DOMAIN_CALLBACK"

# Get existing redirect URIs and add the new ones
az ad app update \
  --id "$ENTRA_APP_ID" \
  --web-redirect-uris \
    "$EASY_AUTH_CALLBACK" \
    "$CUSTOM_DOMAIN_CALLBACK" \
    "https://greenchainz.com/api/auth/callback/microsoft" \
    "https://${APP_FQDN}/api/auth/callback/microsoft" \
  2>/dev/null && echo "   ✅ Entra ID redirect URIs updated" || echo "   ⚠️  Could not update Entra ID app (may need manual update)"

# Enable ID token issuance (required for Easy Auth)
az ad app update \
  --id "$ENTRA_APP_ID" \
  --enable-id-token-issuance true \
  2>/dev/null && echo "   ✅ ID token issuance enabled" || echo "   ⚠️  Could not enable ID token issuance"

# ── Step 3: Enable Easy Auth on Container App ────────────────────────────────
echo ""
echo "🛡️  Step 2: Enabling Easy Auth on Container App..."

# First, enable the auth feature with "Allow unauthenticated" (so public pages work)
az containerapp auth update \
  --name "$CONTAINER_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --unauthenticated-client-action AllowAnonymous \
  --enabled true \
  2>/dev/null && echo "   ✅ Easy Auth enabled (AllowAnonymous mode)" || echo "   ⚠️  Could not enable Easy Auth"

# ── Step 4: Configure Microsoft Entra ID provider ───────────────────────────
echo ""
echo "🔵 Step 3: Configuring Microsoft Entra ID provider..."

if [ -n "$ENTRA_CLIENT_SECRET" ]; then
  az containerapp auth microsoft update \
    --name "$CONTAINER_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --client-id "$ENTRA_APP_ID" \
    --client-secret "$ENTRA_CLIENT_SECRET" \
    --tenant-id "$ENTRA_TENANT_ID" \
    --issuer "https://login.microsoftonline.com/${ENTRA_TENANT_ID}/v2.0" \
    --yes \
    2>/dev/null && echo "   ✅ Microsoft Entra ID configured" || echo "   ⚠️  Failed to configure Microsoft Entra ID"
else
  echo "   ⏭️  Skipped (no client secret available)"
fi

# ── Step 5: Configure Google provider ────────────────────────────────────────
echo ""
echo "🔴 Step 4: Configuring Google provider..."

if [ -n "$GOOGLE_CLIENT_SECRET" ]; then
  az containerapp auth google update \
    --name "$CONTAINER_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --client-id "$GOOGLE_CLIENT_ID" \
    --client-secret "$GOOGLE_CLIENT_SECRET" \
    --scopes "openid" "profile" "email" \
    --yes \
    2>/dev/null && echo "   ✅ Google configured" || echo "   ⚠️  Failed to configure Google"
else
  echo "   ⏭️  Skipped (no client secret available)"
fi

# ── Step 6: Configure LinkedIn as Custom OpenID Connect provider ─────────────
echo ""
echo "🔷 Step 5: Configuring LinkedIn (Custom OIDC) provider..."

if [ -n "$LINKEDIN_CLIENT_SECRET" ]; then
  # LinkedIn must be added as a custom OpenID Connect provider
  # The provider name "linkedin" maps to /.auth/login/linkedin
  az containerapp auth openid-connect add \
    --name "$CONTAINER_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --provider-name "linkedin" \
    --client-id "$LINKEDIN_CLIENT_ID" \
    --client-secret-name "linkedin-client-secret" \
    --openid-configuration "$LINKEDIN_OIDC_METADATA" \
    --scopes "openid" "profile" "email" \
    --yes \
    2>/dev/null && echo "   ✅ LinkedIn (OIDC) configured" || {
      # If it already exists, try updating instead
      az containerapp auth openid-connect update \
        --name "$CONTAINER_APP" \
        --resource-group "$RESOURCE_GROUP" \
        --provider-name "linkedin" \
        --client-id "$LINKEDIN_CLIENT_ID" \
        --client-secret-name "linkedin-client-secret" \
        --openid-configuration "$LINKEDIN_OIDC_METADATA" \
        --scopes "openid" "profile" "email" \
        --yes \
        2>/dev/null && echo "   ✅ LinkedIn (OIDC) updated" || echo "   ⚠️  Failed to configure LinkedIn"
    }

  # Store the LinkedIn client secret in the Container App's secret store
  # (Easy Auth reads secrets from the app's secret store, not Key Vault directly)
  az containerapp secret set \
    --name "$CONTAINER_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --secrets "linkedin-client-secret=$LINKEDIN_CLIENT_SECRET" \
    2>/dev/null && echo "   ✅ LinkedIn secret stored in Container App" || echo "   ⚠️  Could not store LinkedIn secret"
else
  echo "   ⏭️  Skipped (no client secret available)"
fi

# ── Step 7: Add Google redirect URIs ─────────────────────────────────────────
echo ""
echo "📋 Step 6: Reminder — Update Google OAuth Console redirect URIs"
echo ""
echo "   Add these redirect URIs in Google Cloud Console → Credentials:"
echo "     https://${APP_FQDN}/.auth/login/google/callback"
echo "     https://greenchainz.com/.auth/login/google/callback"
echo ""

# ── Step 8: Add LinkedIn redirect URIs ───────────────────────────────────────
echo "📋 Step 7: Reminder — Update LinkedIn Developer Portal redirect URIs"
echo ""
echo "   Add these redirect URIs in LinkedIn Developer Portal → Auth:"
echo "     https://${APP_FQDN}/.auth/login/linkedin/callback"
echo "     https://greenchainz.com/.auth/login/linkedin/callback"
echo ""

# ── Summary ──────────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════════"
echo "  Easy Auth Configuration Complete"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "  Sign-in endpoints:"
echo "    Microsoft: https://${APP_FQDN}/.auth/login/aad"
echo "    Google:    https://${APP_FQDN}/.auth/login/google"
echo "    LinkedIn:  https://${APP_FQDN}/.auth/login/linkedin"
echo ""
echo "  User info:   https://${APP_FQDN}/.auth/me"
echo "  Sign out:    https://${APP_FQDN}/.auth/logout"
echo ""
echo "  ⚠️  Manual steps remaining:"
echo "    1. Update Google OAuth Console redirect URIs (see above)"
echo "    2. Update LinkedIn Developer Portal redirect URIs (see above)"
echo "    3. If using custom domain (greenchainz.com), ensure DNS is configured"
echo "    4. Test each provider: visit the sign-in endpoints above"
echo ""
echo "  Done! 🎉"
