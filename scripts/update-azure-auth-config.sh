#!/bin/bash

# Azure Container Apps Environment Variables Update Script
# This script updates the Container App with required NextAuth environment variables

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
APP_NAME="greenchainz-frontend"
RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-greenchainz-production}"
CLIENT_ID="479e2a01-70ab-4df9-baa4-560d317c3423"
TENANT_ID="ca4f78d4-c753-4893-9cd8-1b309922b4dc"
ISSUER="https://login.microsoftonline.com/${TENANT_ID}/v2.0"

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
echo "Get it from: Azure Portal → Key Vault → Greenchainz-vault-2026 → Secrets → AzureAD-ClientSecret"
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

# Prompt for NextAuth secret (or generate)
echo ""
echo "NextAuth requires a random secret for JWT signing"
read -p "Generate a new random secret? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    echo -e "${GREEN}✓ Generated new NextAuth secret${NC}"
else
    read -sp "Enter existing NextAuth Secret: " NEXTAUTH_SECRET
    echo ""
fi

# Get current Container App URL
echo ""
echo "Getting Container App URL..."
FQDN=$(az containerapp show \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --query properties.configuration.ingress.fqdn \
    -o tsv)

NEXTAUTH_URL="https://$FQDN"
echo -e "${GREEN}✓ Container App URL: $NEXTAUTH_URL${NC}"
echo ""

# Confirmation
echo "========================================="
echo "Configuration to be applied:"
echo "========================================="
echo ""
echo "NEXTAUTH_URL: $NEXTAUTH_URL"
echo "AUTH_URL: $NEXTAUTH_URL"
echo "NEXTAUTH_SECRET: [hidden]"
echo "AUTH_SECRET: [hidden]"
echo ""
echo "AUTH_MICROSOFT_ENTRA_ID_ID: $CLIENT_ID"
echo "AUTH_MICROSOFT_ENTRA_ID_SECRET: [hidden]"
echo "AUTH_MICROSOFT_ENTRA_ID_ISSUER: $ISSUER"
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
    "NEXTAUTH_URL=$NEXTAUTH_URL" \
    "AUTH_URL=$NEXTAUTH_URL" \
    "NEXTAUTH_SECRET=$NEXTAUTH_SECRET" \
    "AUTH_SECRET=$NEXTAUTH_SECRET" \
    "AUTH_MICROSOFT_ENTRA_ID_ID=$CLIENT_ID" \
    "AUTH_MICROSOFT_ENTRA_ID_SECRET=$CLIENT_SECRET" \
    "AUTH_MICROSOFT_ENTRA_ID_ISSUER=$ISSUER" \
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
echo "2. Test login at: $NEXTAUTH_URL/login"
echo "3. Monitor logs: az containerapp logs show --name $APP_NAME --resource-group $RESOURCE_GROUP --tail 50"
echo ""
echo "If login still fails:"
echo "1. Check redirect URIs match exactly: $NEXTAUTH_URL/api/auth/callback/microsoft-entra-id"
echo "2. Verify client secret is correct"
echo "3. Check logs for detailed error messages"
echo ""
