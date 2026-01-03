#!/bin/bash
# =============================================================================
# GreenChainz Azure Key Vault Secrets Setup
# =============================================================================
# Usage: ./azure/setup-secrets.sh
#
# Required Key Vault Secrets:
#   - postgres-password   : Database password (set DB_PASSWORD env var)
#   - jwt-secret          : JWT signing secret (auto-generated)
#   - session-secret      : Express session secret (auto-generated)
#   - redis-password      : Azure Redis Cache password (fetched from Azure)
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

# Redis password (fetched from Azure)
az keyvault secret set \
    --vault-name "$VAULT_NAME" \
    --name "redis-password" \
    --value "$REDIS_PASSWORD" &> /dev/null
echo_success "redis-password set"

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                   Secrets Configured                       ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Required secrets in Key Vault ($VAULT_NAME):"
echo "  ✅ jwt-secret"
echo "  ✅ session-secret"
echo "  ✅ redis-password"
if [ -n "$DB_PASSWORD" ]; then
    echo "  ✅ postgres-password"
else
    echo "  ⚠️  postgres-password (not set - run with DB_PASSWORD env var)"
fi
echo ""
echo "Next steps:"
echo "  1. Grant managed identity access to Key Vault:"
echo "     ./azure/grant-keyvault-access.sh"
echo ""
echo "  2. Build and deploy your application:"
echo "     ./azure/deploy.sh all"
echo ""
