#!/usr/bin/env bash
# ============================================================================
# master-fix-azure.sh — GreenChainz Azure Infrastructure Master Fix
#
# Addresses all 7 issues from the March 2026 audit:
#   1. Google provider corrupted client ID
#   2. LinkedIn provider missing from auth config
#   3. Microsoft Entra ID 404 (restart sidecar)
#   4. /.auth/login/aad 404 (force revision restart)
#   5. Stale Entra redirect URIs
#   6. linkedin-client-secret has no KV reference
#   7. Diagnostics for legacy greenchainz-container
#
# Prerequisites:
#   - Azure CLI installed and logged in (az login)
#   - Contributor role on rg-greenchainz-prod-container
#   - Application Administrator or Owner on the Entra app registration
#
# Usage:
#   chmod +x scripts/master-fix-azure.sh
#   ./scripts/master-fix-azure.sh
# ============================================================================

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
RG="rg-greenchainz-prod-container"
APP="greenchainz-frontend"
KV="greenchainz-vault"

ENTRA_APP_ID="479e2a01-70ab-4df9-baa4-560d317c3423"
ENTRA_TENANT_ID="ca4f78d4-c753-4893-9cd8-1b309922b4dc"
GOOGLE_CLIENT_ID="856406055657-actjkcr6fd9hpvq6b0a7harehqscgj9d.apps.googleusercontent.com"
LINKEDIN_CLIENT_ID="77lzd3h7nzedke"
LINKEDIN_OIDC="https://www.linkedin.com/oauth/.well-known/openid-configuration"

# Managed Identity resource ID (for KV references)
MI_ID="/subscriptions/f9164e8d-d74d-43ea-98d4-b0466b3ef8b8/resourcegroups/rg-greenchainz-prod-container/providers/Microsoft.ManagedIdentity/userAssignedIdentities/id-greenchainz-backend"

# Get FQDN
FQDN=$(az containerapp show \
  --name "$APP" --resource-group "$RG" \
  --query "properties.configuration.ingress.fqdn" -o tsv 2>/dev/null || echo "")

if [ -z "$FQDN" ]; then
  FQDN="greenchainz-frontend.jollyrock-a66f2da6.eastus.azurecontainerapps.io"
  echo "⚠️  Could not auto-detect FQDN, using default: $FQDN"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  GreenChainz Azure Infrastructure — Master Fix"
echo "═══════════════════════════════════════════════════════════════════"
echo "  Container App:  $APP"
echo "  Resource Group: $RG"
echo "  FQDN:           $FQDN"
echo "  Key Vault:      $KV"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

ERRORS=0

# ── FIX 1: Google Provider (corrupted client ID) ────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FIX 1: Google Provider — Correct client ID and secret name"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if az containerapp auth google update \
  --name "$APP" --resource-group "$RG" \
  --client-id "$GOOGLE_CLIENT_ID" \
  --client-secret-name "google-client-secret" \
  --scopes "openid profile email" \
  --yes > /dev/null 2>&1; then
  echo "  ✅ Google provider updated"
  echo "     Client ID: $GOOGLE_CLIENT_ID"
  echo "     Secret:    google-client-secret (→ KV: GOOGLE-SECRET)"
else
  echo "  ❌ Failed to update Google provider"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# ── FIX 2: LinkedIn Provider (missing or misconfigured) ─────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FIX 2: LinkedIn Provider — Add or update custom OIDC"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# First, ensure the linkedin-client-secret has a value
echo "  Setting linkedin-client-secret from Key Vault..."
LINKEDIN_SECRET=$(az keyvault secret show \
  --vault-name "$KV" --name "LINKEDIN-SECRET" \
  --query "value" -o tsv 2>/dev/null || echo "")

if [ -z "$LINKEDIN_SECRET" ]; then
  echo "  ❌ LINKEDIN-SECRET not found in Key Vault"
  echo "     Run: az keyvault secret set --vault-name $KV --name LINKEDIN-SECRET --value '<secret>'"
  ERRORS=$((ERRORS + 1))
else
  # Set the secret value in the Container App
  if az containerapp secret set \
    --name "$APP" --resource-group "$RG" \
    --secrets "linkedin-client-secret=$LINKEDIN_SECRET" > /dev/null 2>&1; then
    echo "  ✅ linkedin-client-secret value set"
  else
    echo "  ⚠️  Could not set linkedin-client-secret (may already exist with same value)"
  fi

  # Try update first, then add
  if az containerapp auth openid-connect update \
    --name "$APP" --resource-group "$RG" \
    --provider-name linkedin \
    --client-id "$LINKEDIN_CLIENT_ID" \
    --client-secret-name "linkedin-client-secret" \
    --openid-configuration "$LINKEDIN_OIDC" \
    --yes > /dev/null 2>&1; then
    echo "  ✅ LinkedIn OIDC provider updated"
  elif az containerapp auth openid-connect add \
    --name "$APP" --resource-group "$RG" \
    --provider-name linkedin \
    --client-id "$LINKEDIN_CLIENT_ID" \
    --client-secret-name "linkedin-client-secret" \
    --openid-configuration "$LINKEDIN_OIDC" \
    --yes > /dev/null 2>&1; then
    echo "  ✅ LinkedIn OIDC provider added"
  else
    echo "  ❌ Failed to configure LinkedIn provider"
    ERRORS=$((ERRORS + 1))
  fi
fi
echo ""

# ── FIX 3: Microsoft Entra ID — Verify config ───────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FIX 3: Microsoft Entra ID — Verify and re-apply config"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if az containerapp auth microsoft update \
  --name "$APP" --resource-group "$RG" \
  --client-id "$ENTRA_APP_ID" \
  --client-secret-name "microsoft-client-secret" \
  --tenant-id "$ENTRA_TENANT_ID" \
  --yes > /dev/null 2>&1; then
  echo "  ✅ Microsoft Entra ID provider configured"
  echo "     Client ID: $ENTRA_APP_ID"
  echo "     Tenant:    $ENTRA_TENANT_ID"
  echo "     Secret:    microsoft-client-secret (→ KV: microsoft-client-secret)"
else
  echo "  ❌ Failed to configure Microsoft Entra ID"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# ── FIX 4: Clean up Entra redirect URIs ─────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FIX 4: Entra App Registration — Clean redirect URIs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "  Removing stale URIs, adding correct ones..."
if az ad app update \
  --id "$ENTRA_APP_ID" \
  --web-redirect-uris \
    "https://${FQDN}/.auth/login/aad/callback" \
    "https://www.greenchainz.com/.auth/login/aad/callback" \
    "https://greenchainz.com/.auth/login/aad/callback" \
    "http://localhost:3000/.auth/login/aad/callback" \
  2>/dev/null; then
  echo "  ✅ Redirect URIs updated"
  echo "     + https://${FQDN}/.auth/login/aad/callback"
  echo "     + https://www.greenchainz.com/.auth/login/aad/callback"
  echo "     + https://greenchainz.com/.auth/login/aad/callback"
  echo "     + http://localhost:3000/.auth/login/aad/callback (dev)"
  echo "     Removed: greenchainz-container callback, NextAuth callback"
else
  echo "  ⚠️  Could not update redirect URIs (may need Application Administrator role)"
fi

# Enable ID token issuance
az ad app update --id "$ENTRA_APP_ID" --enable-id-token-issuance true 2>/dev/null \
  && echo "  ✅ ID token issuance enabled" \
  || echo "  ⚠️  Could not enable ID token issuance"
echo ""

# ── FIX 5: Force restart to pick up auth config changes ─────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FIX 5: Restart active revision (picks up auth config changes)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ACTIVE_REV=$(az containerapp revision list \
  --name "$APP" --resource-group "$RG" \
  --query "[?properties.active==\`true\`].name" -o tsv 2>/dev/null || echo "")

if [ -n "$ACTIVE_REV" ]; then
  echo "  Active revision: $ACTIVE_REV"
  if az containerapp revision restart \
    --name "$APP" --resource-group "$RG" \
    --revision "$ACTIVE_REV" > /dev/null 2>&1; then
    echo "  ✅ Revision restarted"
    echo "  ⏳ Waiting 30 seconds for sidecar to initialize..."
    sleep 30
  else
    echo "  ⚠️  Could not restart revision"
  fi
else
  echo "  ⚠️  No active revision found"
fi
echo ""

# ── VERIFY: Full auth config ────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  VERIFICATION: Current auth configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

az containerapp auth show \
  --name "$APP" --resource-group "$RG" \
  -o json 2>/dev/null || echo "  ❌ Could not retrieve auth config"

echo ""

# ── VERIFY: Test /.auth/login/aad ────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  VERIFICATION: Testing /.auth/login/aad"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  "https://${FQDN}/.auth/login/aad" 2>/dev/null || echo "000")

REDIRECT_URL=$(curl -s -o /dev/null -w "%{redirect_url}" \
  "https://${FQDN}/.auth/login/aad" 2>/dev/null || echo "")

if [ "$HTTP_CODE" = "302" ]; then
  echo "  ✅ /.auth/login/aad returns HTTP 302 (redirect)"
  echo "     Redirects to: ${REDIRECT_URL:0:80}..."
elif [ "$HTTP_CODE" = "200" ]; then
  echo "  ⚠️  /.auth/login/aad returns HTTP 200 (may be the app's catch-all)"
  echo "     The sidecar may not be intercepting. Check system logs."
elif [ "$HTTP_CODE" = "404" ]; then
  echo "  ❌ /.auth/login/aad returns HTTP 404"
  echo "     The Easy Auth sidecar is not intercepting requests."
  echo "     Check system logs:"
  echo "     az containerapp logs show --name $APP --resource-group $RG --type system --tail 50"
  ERRORS=$((ERRORS + 1))
else
  echo "  ⚠️  /.auth/login/aad returned HTTP $HTTP_CODE"
fi
echo ""

# ── DIAGNOSTICS: Legacy container app ────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  DIAGNOSTIC: Legacy greenchainz-container status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

LEGACY_REPLICAS=$(az containerapp revision list \
  --name greenchainz-container --resource-group "$RG" \
  --query "[?properties.active==\`true\`].properties.replicas" -o tsv 2>/dev/null || echo "unknown")

LEGACY_AUTH=$(az containerapp auth show \
  --name greenchainz-container --resource-group "$RG" \
  --query "platform.enabled" -o tsv 2>/dev/null || echo "unknown")

echo "  greenchainz-container:"
echo "    Active replicas: $LEGACY_REPLICAS"
echo "    Auth enabled:    $LEGACY_AUTH"
echo ""
if [ "$LEGACY_AUTH" = "true" ]; then
  echo "  ⚠️  Legacy container also has Easy Auth enabled."
  echo "     This may cause confusion. Consider disabling it:"
  echo "     az containerapp auth update --name greenchainz-container --resource-group $RG --enabled false"
fi
echo ""

# ── Summary ──────────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════════"
if [ "$ERRORS" -eq 0 ]; then
  echo "  ✅ All fixes applied successfully"
else
  echo "  ⚠️  $ERRORS issue(s) need attention (see errors above)"
fi
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "  Test endpoints:"
echo "    Microsoft: https://${FQDN}/.auth/login/aad"
echo "    Google:    https://${FQDN}/.auth/login/google"
echo "    LinkedIn:  https://${FQDN}/.auth/login/linkedin"
echo "    User info: https://${FQDN}/.auth/me"
echo "    Logout:    https://${FQDN}/.auth/logout"
echo ""
echo "  Manual steps remaining:"
echo "    1. Google Cloud Console → add redirect URI:"
echo "       https://${FQDN}/.auth/login/google/callback"
echo "       https://greenchainz.com/.auth/login/google/callback"
echo ""
echo "    2. LinkedIn Developer Portal → add redirect URL:"
echo "       https://${FQDN}/.auth/login/linkedin/callback"
echo "       https://greenchainz.com/.auth/login/linkedin/callback"
echo ""
echo "  Done!"
