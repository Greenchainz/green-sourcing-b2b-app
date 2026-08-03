#!/bin/bash

# Azure Container Apps Environment Variables Update Script
# This script updates the Container App with required Azure AD auth environment variables

set -e

echo "========================================="
echo "Azure Container Apps - Update Auth Config"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
# Note: Client ID and Tenant ID are NOT secrets - they are public identifiers
# These values are specific to the GreenChainz Azure AD app registration
APP_NAME="greenchainz-frontend"
RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-greenchainz-production}"
CLIENT_ID="8b597068-9347-4e99-8860-8c4e9a9bc112"
TENANT_ID="1d04bf50-8175-40af-a9d5-f8e441460b06"

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}✗ Azure CLI not found${NC}"
    exit 1
fi

# Check if logged in
if ! az account show &> /dev/null; then
    echo -e "${RED}✗ Not logged in to Azure${NC}"
    echo "Please run: az login"
    exit 1
fi

echo -e "${GREEN}✓ Azure CLI ready${NC}"
echo ""

# Prompt for secrets
echo "This script will update environment variables for: $APP_NAME"
echo "Resource Group: $RESOURCE_GROUP"
echo ""
echo -e "${YELLOW}Note: You will need the Azure AD client secret${NC}"
echo "Get it from: Azure Portal → Key Vault → Greenchainz-vault-2026 → Secrets → microsoft-client-secret"
echo ""
read -p "Do you have the client secret? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please get the secret first, then run this script again"
    exit 1
fi

# Prompt for client secret
echo ""
read -sp "Enter Azure AD Client Secret: " CLIENT_SECRET
echo ""

# Get current Container App URL
echo ""
echo "Getting Container App URL..."
FQDN=$(az containerapp show \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --query properties.configuration.ingress.fqdn \
    -o tsv)

APP_URL="https://$FQDN"
echo -e "${GREEN}✓ Container App URL: $APP_URL${NC}"
echo ""

# Confirmation
echo "========================================="
echo "Configuration to be applied:"
echo "========================================="
echo ""
echo "AZURE_AD_CLIENT_ID: $CLIENT_ID"
echo "AZURE_AD_CLIENT_SECRET: [hidden]"
echo "AZURE_AD_TENANT_ID: $TENANT_ID"
echo ""
read -p "Apply these changes? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled"
    exit 0
fi

echo ""
echo "Updating Container App environment variables..."
echo ""

# Update environment variables
az containerapp update \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --set-env-vars \
    "AZURE_AD_CLIENT_ID=$CLIENT_ID" \
    "AZURE_AD_CLIENT_SECRET=$CLIENT_SECRET" \
    "AZURE_AD_TENANT_ID=$TENANT_ID" \
    "COOKIE_DOMAIN=.greenchainz.com" \
    "NODE_ENV=production" \
    > /dev/null

echo -e "${GREEN}✓ Environment variables updated${NC}"
echo ""

# Restart container app
echo "Restarting Container App..."
az containerapp revision restart \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    > /dev/null

echo -e "${GREEN}✓ Container App restarted${NC}"
echo ""

# Summary
echo "========================================="
echo "Deployment Complete"
echo "========================================="
echo ""
echo -e "${GREEN}✓ Environment variables updated${NC}"
echo -e "${GREEN}✓ Container App restarted${NC}"
echo ""
echo "Next steps:"
echo "1. Verify redirect URIs in Azure Portal (see docs/AZURE_AD_FIX.md)"
echo "2. Test login at: $APP_URL/login"
echo "3. Monitor logs: az containerapp logs show --name $APP_NAME --resource-group $RESOURCE_GROUP --tail 50"
echo ""
echo "If login still fails:"
echo "1. Check redirect URIs match exactly: $APP_URL/api/auth/callback"
echo "2. Verify client secret is correct"
echo "3. Check logs for detailed error messages"
echo ""
