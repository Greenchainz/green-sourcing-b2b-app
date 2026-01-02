#!/bin/bash

# Grant Container App managed identity access to Key Vault
# Usage: ./azure/grant-keyvault-access.sh

set -e

echo "🔐 Granting Key Vault access to Container App..."

# Variables
CONTAINER_APP_NAME="greenchainz-container"
RESOURCE_GROUP="rg-greenchainz-prod-container"
VAULT_NAME="greenchianz-vault"
VAULT_RG="greenchainz-production"

# Check if logged in
if ! az account show &> /dev/null; then
    echo "❌ Not logged into Azure. Run 'az login' first."
    exit 1
fi

# Get Container App managed identity
echo "🔍 Getting Container App managed identity..."
PRINCIPAL_ID=$(az containerapp show \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "identity.principalId" -o tsv)

if [ -z "$PRINCIPAL_ID" ]; then
    echo "❌ Could not find managed identity for $CONTAINER_APP_NAME"
    echo "✅ Make sure the Container App has system-assigned managed identity enabled"
    echo "✅ You can enable it with:"
    echo "   az containerapp identity assign --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --system-assigned"
    exit 1
fi

echo "✅ Principal ID: $PRINCIPAL_ID"

# Grant access to Key Vault
echo "📝 Granting Key Vault access..."
az keyvault set-policy \
  --name "$VAULT_NAME" \
  --resource-group "$VAULT_RG" \
  --object-id "$PRINCIPAL_ID" \
  --secret-permissions get list &> /dev/null

echo "✅ Key Vault access granted"
echo ""
echo "🎉 Done! Container App can now read secrets from Key Vault"
