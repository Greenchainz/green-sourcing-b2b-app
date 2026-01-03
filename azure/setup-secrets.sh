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

# Optional: Application Insights (for monitoring and telemetry)
# Set APPINSIGHTS_CONNECTION_STRING environment variable before running this script
if [ -n "$APPINSIGHTS_CONNECTION_STRING" ]; then
  az keyvault secret set \
    --vault-name "$VAULT_NAME" \
    --name "appinsights-connection-string" \
    --value "$APPINSIGHTS_CONNECTION_STRING" &> /dev/null && echo "✅ appinsights-connection-string set"
else
  echo "ℹ️  APPINSIGHTS_CONNECTION_STRING not set; skipping appinsights-connection-string (optional)"
fi

# Optional: Document Intelligence (for AI-powered document parsing)
# Set AZURE_DOCUMENT_INTELLIGENCE_KEY environment variable before running this script
if [ -n "$AZURE_DOCUMENT_INTELLIGENCE_KEY" ]; then
  az keyvault secret set \
    --vault-name "$VAULT_NAME" \
    --name "document-intelligence-key" \
    --value "$AZURE_DOCUMENT_INTELLIGENCE_KEY" &> /dev/null && echo "✅ document-intelligence-key set"
else
  echo "ℹ️  AZURE_DOCUMENT_INTELLIGENCE_KEY not set; skipping document-intelligence-key (optional)"
fi

echo ""
echo "🎉 All required secrets configured successfully!"
echo ""
echo "Next steps:"
echo "1. Grant managed identity access to Key Vault:"
echo "   ./azure/grant-keyvault-access.sh"
echo ""
echo "2. The secrets are already configured in azure/containerapp-backend.yaml"
echo ""
echo "3. Optional: To enable Application Insights monitoring:"
echo "   - Set APPINSIGHTS_CONNECTION_STRING and re-run this script"
echo "   - Uncomment Application Insights configuration in azure/containerapp-backend.yaml"
echo "   - Set FEATURE_AZURE_MONITORING=true in the YAML"
echo ""
echo "4. Optional: To enable Document Intelligence AI:"
echo "   - Set AZURE_DOCUMENT_INTELLIGENCE_KEY and re-run this script"
echo "   - Uncomment Document Intelligence configuration in azure/containerapp-backend.yaml"
echo "   - Set FEATURE_AI_DOCUMENT_ANALYSIS=true in the YAML"
echo ""
