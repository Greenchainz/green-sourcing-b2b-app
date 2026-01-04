#!/bin/bash
# =============================================================================
# GreenChainz Azure Key Vault Secrets Setup
# =============================================================================
# Usage: ./azure/setup-secrets.sh
#
# Required Key Vault Secrets:
#   - postgres-password       : Database password (set DB_PASSWORD env var)
#   - jwt-secret              : JWT signing secret (auto-generated)
#   - session-secret          : Express session secret (auto-generated)
#   - redis-password          : Azure Redis Cache password (fetched from Azure)
#   - stripe-secret-key       : Stripe API secret key (set STRIPE_SECRET_KEY env var)
#   - stripe-webhook-secret   : Stripe webhook signing secret (set STRIPE_WEBHOOK_SECRET env var)
#   - linkedin-client-id      : LinkedIn OAuth client ID (set LINKEDIN_CLIENT_ID env var)
#   - linkedin-client-secret  : LinkedIn OAuth client secret (set LINKEDIN_CLIENT_SECRET env var)
# =============================================================================

set -e

# Configuration
VAULT_NAME="greenchianz-vault"
REDIS_NAME="greenchainz"
REDIS_RG="greenchainz-production"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
echo_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
echo_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
echo_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║      GreenChainz Key Vault Secrets Setup                   ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check Azure login
if ! az account show &> /dev/null; then
    echo_error "Not logged into Azure. Run 'az login' first."
    exit 1
fi
echo_success "Connected to Azure"

# ─────────────────────────────────────────────────────────────────────────────
# Generate secure secrets
# ─────────────────────────────────────────────────────────────────────────────
echo_info "Generating secure secrets..."
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
COOKIE_SECRET=$(openssl rand -base64 32)

# ─────────────────────────────────────────────────────────────────────────────
# Fetch Redis password from Azure
# ─────────────────────────────────────────────────────────────────────────────
echo_info "Fetching Redis password from Azure..."
REDIS_PASSWORD=$(az redis list-keys \
  --name "$REDIS_NAME" \
  --resource-group "$REDIS_RG" \
  --query "primaryKey" -o tsv 2>/dev/null || echo "")

if [ -z "$REDIS_PASSWORD" ]; then
    echo_error "Could not retrieve Redis password. Check Azure resources."
    exit 1
fi
echo_success "Redis password retrieved"

# ─────────────────────────────────────────────────────────────────────────────
# Set secrets in Key Vault
# ─────────────────────────────────────────────────────────────────────────────
echo_info "Setting secrets in Key Vault: $VAULT_NAME"

# Database password (required - must be set via env var)
if [ -n "$DB_PASSWORD" ]; then
    az keyvault secret set \
        --vault-name "$VAULT_NAME" \
        --name "postgres-password" \
        --value "$DB_PASSWORD" &> /dev/null
    echo_success "postgres-password set"
else
    echo_warn "DB_PASSWORD not set; skipping postgres-password"
    echo "   Set it with: export DB_PASSWORD='your-db-password'"
fi

# JWT secret (auto-generated)
az keyvault secret set \
    --vault-name "$VAULT_NAME" \
    --name "jwt-secret" \
    --value "$JWT_SECRET" &> /dev/null
echo_success "jwt-secret set (auto-generated)"

# Session secret (auto-generated)
az keyvault secret set \
    --vault-name "$VAULT_NAME" \
    --name "session-secret" \
    --value "$SESSION_SECRET" &> /dev/null
echo_success "session-secret set (auto-generated)"

# Cookie secret (auto-generated)
az keyvault secret set \
    --vault-name "$VAULT_NAME" \
    --name "cookie-secret" \
    --value "$COOKIE_SECRET" &> /dev/null
echo_success "cookie-secret set (auto-generated)"

# Redis password (fetched from Azure)
az keyvault secret set \
    --vault-name "$VAULT_NAME" \
    --name "redis-password" \
    --value "$REDIS_PASSWORD" &> /dev/null
echo_success "redis-password set"

# ─────────────────────────────────────────────────────────────────────────────
# Stripe secrets (required for payment processing)
# ─────────────────────────────────────────────────────────────────────────────
echo_info "Setting Stripe secrets..."

if [ -n "$STRIPE_SECRET_KEY" ]; then
    az keyvault secret set \
        --vault-name "$VAULT_NAME" \
        --name "stripe-secret-key" \
        --value "$STRIPE_SECRET_KEY" &> /dev/null
    echo_success "stripe-secret-key set"
else
    echo_warn "STRIPE_SECRET_KEY not set; skipping stripe-secret-key"
    echo "   Set it with: export STRIPE_SECRET_KEY='sk_live_...'"
fi

if [ -n "$STRIPE_WEBHOOK_SECRET" ]; then
    az keyvault secret set \
        --vault-name "$VAULT_NAME" \
        --name "stripe-webhook-secret" \
        --value "$STRIPE_WEBHOOK_SECRET" &> /dev/null
    echo_success "stripe-webhook-secret set"
else
    echo_warn "STRIPE_WEBHOOK_SECRET not set; skipping stripe-webhook-secret"
    echo "   Set it with: export STRIPE_WEBHOOK_SECRET='whsec_...'"
fi

# ─────────────────────────────────────────────────────────────────────────────
# LinkedIn OAuth secrets (required for buyer verification)
# ─────────────────────────────────────────────────────────────────────────────
echo_info "Setting LinkedIn OAuth secrets..."

if [ -n "$LINKEDIN_CLIENT_ID" ]; then
    az keyvault secret set \
        --vault-name "$VAULT_NAME" \
        --name "linkedin-client-id" \
        --value "$LINKEDIN_CLIENT_ID" &> /dev/null
    echo_success "linkedin-client-id set"
else
    echo_warn "LINKEDIN_CLIENT_ID not set; skipping linkedin-client-id"
    echo "   Set it with: export LINKEDIN_CLIENT_ID='your-client-id'"
fi

if [ -n "$LINKEDIN_CLIENT_SECRET" ]; then
    az keyvault secret set \
        --vault-name "$VAULT_NAME" \
        --name "linkedin-client-secret" \
        --value "$LINKEDIN_CLIENT_SECRET" &> /dev/null
    echo_success "linkedin-client-secret set"
else
    echo_warn "LINKEDIN_CLIENT_SECRET not set; skipping linkedin-client-secret"
    echo "   Set it with: export LINKEDIN_CLIENT_SECRET='your-client-secret'"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                   Secrets Configured                       ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Core secrets in Key Vault ($VAULT_NAME):"
echo "  ✅ jwt-secret"
echo "  ✅ session-secret"
echo "  ✅ cookie-secret"
echo "  ✅ redis-password"
if [ -n "$DB_PASSWORD" ]; then
    echo "  ✅ postgres-password"
else
    echo "  ⚠️  postgres-password (not set - run with DB_PASSWORD env var)"
fi
echo ""
echo "Payment secrets (Stripe):"
if [ -n "$STRIPE_SECRET_KEY" ]; then
    echo "  ✅ stripe-secret-key"
else
    echo "  ⚠️  stripe-secret-key (not set - run with STRIPE_SECRET_KEY env var)"
fi
if [ -n "$STRIPE_WEBHOOK_SECRET" ]; then
    echo "  ✅ stripe-webhook-secret"
else
    echo "  ⚠️  stripe-webhook-secret (not set - run with STRIPE_WEBHOOK_SECRET env var)"
fi
echo ""
echo "LinkedIn OAuth secrets:"
if [ -n "$LINKEDIN_CLIENT_ID" ]; then
    echo "  ✅ linkedin-client-id"
else
    echo "  ⚠️  linkedin-client-id (not set - run with LINKEDIN_CLIENT_ID env var)"
fi
if [ -n "$LINKEDIN_CLIENT_SECRET" ]; then
    echo "  ✅ linkedin-client-secret"
else
    echo "  ⚠️  linkedin-client-secret (not set - run with LINKEDIN_CLIENT_SECRET env var)"
fi
echo ""
echo "To set all secrets at once, run:"
echo "  export DB_PASSWORD='your-db-password'"
echo "  export STRIPE_SECRET_KEY='sk_live_...'"
echo "  export STRIPE_WEBHOOK_SECRET='whsec_...'"
echo "  export LINKEDIN_CLIENT_ID='your-client-id'"
echo "  export LINKEDIN_CLIENT_SECRET='your-client-secret'"
echo "  ./azure/setup-secrets.sh"
echo ""
echo "Next steps:"
echo "  1. Grant managed identity access to Key Vault:"
echo "     ./azure/grant-keyvault-access.sh"
echo ""
echo "  2. Build and deploy your application:"
echo "     ./azure/deploy.sh all"
echo ""
