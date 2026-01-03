#!/bin/bash

# GreenChainz Azure Key Vault Secrets Setup
# Usage: ./azure/setup-secrets.sh

set -e

echo "🔐 Setting up GreenChainz Azure Key Vault Secrets..."

# Variables
VAULT_NAME="greenchianz-vault"
RESSOURCE_GROUP="greenchainz-production"

# Check if logged in
if ! az account show &> /dev/null; then
    echo "❌ Not logged into Azure. Run 'az login' first."
    exit 1
fi

echo "✅ Connected to Azure"

# Generate secure secrets
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)

# Get Redis key
echo "🔍 Fetching Redis password..."
REDIS_PASSWORD=$(az redis list-keys \
  --name greenchainz \
  --resource-group greenchainz-production \
  --query "primaryKey" -o tsv)

if [ -z "$REDIS_PASSWORD" ]; then
    echo "❌ Could not retrieve Redis password. Check Azure resources."
    exit 1
fi
echo "✅ Redis password retrieved"

# Set secrets in Key Vault
echo "📝 Creating secrets in $VAULT_NAME..."

if [ -n "$DB_PASSWORD" ]; then
  az keyvault secret set \
    --vault-name "$VAULT_NAME" \
    --name "postgres-password" \
    --value "$DB_PASSWORD" &> /dev/null && echo "✅ postgres-password set"
else
  echo "ℹ️  DB_PASSWORD not set; skipping postgres-password"
fi

az keyvault secret set \
  --vault-name "$VAULT_NAME" \
  --name "jwt-secret" \
  --value "$JWT_SECRET" &> /dev/null && echo "✅ jwt-secret set"

az keyvault secret set \
  --vault-name "$VAULT_NAME" \
  --name "session-secret" \
  --value "$SESSION_SECRET" &> /dev/null && echo "✅ session-secret set"

az keyvault secret set \
  --vault-name "$VAULT_NAME" \
  --name "redis-password" \
  --value "$REDIS_PASSWORD" &> /dev/null && echo "✅ redis-password set"

# Application Insights (required by backend YAML, but backend handles empty value gracefully)
APPINSIGHTS_VALUE="${APPINSIGHTS_CONNECTION_STRING:-}"
az keyvault secret set \
  --vault-name "$VAULT_NAME" \
  --name "appinsights-connection-string" \
  --value "$APPINSIGHTS_VALUE" &> /dev/null && echo "✅ appinsights-connection-string set"
if [ -z "$APPINSIGHTS_CONNECTION_STRING" ]; then
  echo "   ⚠️  APPINSIGHTS_CONNECTION_STRING not provided - set to empty (monitoring will be disabled)"
fi

# Azure Document Intelligence (required by backend YAML, but backend handles empty value gracefully)
DOCUMENT_INTEL_VALUE="${AZURE_DOCUMENT_INTELLIGENCE_KEY:-}"
az keyvault secret set \
  --vault-name "$VAULT_NAME" \
  --name "document-intelligence-key" \
  --value "$DOCUMENT_INTEL_VALUE" &> /dev/null && echo "✅ document-intelligence-key set"
if [ -z "$AZURE_DOCUMENT_INTELLIGENCE_KEY" ]; then
  echo "   ⚠️  AZURE_DOCUMENT_INTELLIGENCE_KEY not provided - set to empty (AI document analysis will be disabled)"
fi

echo ""
echo "🎉 All secrets configured successfully!"
echo ""
echo "Next steps:"
echo "1. Add to Container App environment variables:"
echo "   JWT_SECRET=@Microsoft.KeyVault(SecretUri=https://$VAULT_NAME.vault.azure.net/secrets/jwt-secret/)"
echo "   SESSION_SECRET=@Microsoft.KeyVault(SecretUri=https://$VAULT_NAME.vault.azure.net/secrets/session-secret/)"
echo "   REDIS_PASSWORD=@Microsoft.KeyVault(SecretUri=https://$VAULT_NAME.vault.azure.net/secrets/redis-password/)"
echo "   APPLICATIONINSIGHTS_CONNECTION_STRING=@Microsoft.KeyVault(SecretUri=https://$VAULT_NAME.vault.azure.net/secrets/appinsights-connection-string/)"
echo "   AZURE_DOCUMENT_INTELLIGENCE_KEY=@Microsoft.KeyVault(SecretUri=https://$VAULT_NAME.vault.azure.net/secrets/document-intelligence-key/)"
echo ""
echo "2. Grant managed identity access to Key Vault:"
echo "   ./azure/grant-keyvault-access.sh"
echo ""
