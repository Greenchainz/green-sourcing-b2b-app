#!/bin/bash

# Azure AD Authentication Configuration Verification Script
# This script helps verify that all necessary Azure AD configurations are in place

set -e

echo "========================================="
echo "Azure AD Configuration Verification"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}✗ Azure CLI not found. Please install: https://docs.microsoft.com/cli/azure/install-azure-cli${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Azure CLI found${NC}"
echo ""

# Variables
# Note: Client ID and Tenant ID are NOT secrets - they are public identifiers
# These values are specific to the GreenChainz Azure AD app registration
APP_NAME="greenchainz-frontend"
RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-greenchainz-production}"
CLIENT_ID="479e2a01-70ab-4df9-baa4-560d317c3423"
TENANT_ID="ca4f78d4-c753-4893-9cd8-1b309922b4dc"

echo "Configuration:"
echo "  App Name: $APP_NAME"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Client ID: $CLIENT_ID"
echo "  Tenant ID: $TENANT_ID"
echo ""

# Check if logged in to Azure
echo "Checking Azure login status..."
if ! az account show &> /dev/null; then
    echo -e "${RED}✗ Not logged in to Azure. Please run: az login${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Logged in to Azure${NC}"
SUBSCRIPTION=$(az account show --query name -o tsv)
echo "  Subscription: $SUBSCRIPTION"
echo ""

# Check Container App exists
echo "Checking Container App..."
if ! az containerapp show --name $APP_NAME --resource-group $RESOURCE_GROUP &> /dev/null; then
    echo -e "${RED}✗ Container App '$APP_NAME' not found in resource group '$RESOURCE_GROUP'${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Container App found${NC}"
echo ""

# Get Container App URL
echo "Getting Container App URL..."
FQDN=$(az containerapp show \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --query properties.configuration.ingress.fqdn \
    -o tsv)

echo -e "${GREEN}✓ Container App URL: https://$FQDN${NC}"
echo ""

# Check environment variables
echo "========================================="
echo "Checking Environment Variables"
echo "========================================="
echo ""

check_env_var() {
    local var_name=$1
    local var_value=$(az containerapp show \
        --name $APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --query "properties.template.containers[0].env[?name=='$var_name'].value | [0]" \
        -o tsv 2>/dev/null)
    
    if [ -z "$var_value" ] || [ "$var_value" == "null" ]; then
        echo -e "${RED}✗ $var_name - NOT SET${NC}"
        return 1
    else
        # Don't print secret values, just confirm they exist
        if [[ "$var_name" == *"SECRET"* ]] || [[ "$var_name" == *"KEY"* ]]; then
            echo -e "${GREEN}✓ $var_name - SET (secret)${NC}"
        else
            echo -e "${GREEN}✓ $var_name - SET: $var_value${NC}"
        fi
        return 0
    fi
}

# Check required NextAuth variables
echo "NextAuth Configuration:"
check_env_var "NEXTAUTH_URL" || MISSING=1
check_env_var "NEXTAUTH_SECRET" || MISSING=1
echo ""

# Check Azure AD variables (NextAuth v5 format)
echo "Microsoft Entra ID Provider (NextAuth v5):"
check_env_var "AUTH_MICROSOFT_ENTRA_ID_ID" || MISSING=1
check_env_var "AUTH_MICROSOFT_ENTRA_ID_SECRET" || MISSING=1
check_env_var "AUTH_MICROSOFT_ENTRA_ID_ISSUER" || MISSING=1
echo ""

# Check legacy Azure AD variables
echo "Legacy Azure AD Variables:"
check_env_var "AZURE_AD_CLIENT_ID" || LEGACY_MISSING=1
check_env_var "AZURE_AD_CLIENT_SECRET" || LEGACY_MISSING=1
check_env_var "AZURE_AD_TENANT_ID" || LEGACY_MISSING=1
echo ""

# Check public variables (these should be embedded at build time)
echo "Public Variables (embedded at build time):"
echo -e "${YELLOW}Note: These are set during build, not runtime${NC}"
echo "  NEXT_PUBLIC_SITE_URL should be: https://$FQDN or https://greenchainz.com"
echo ""

# Summary
echo "========================================="
echo "Summary"
echo "========================================="
echo ""

if [ -z "$MISSING" ]; then
    echo -e "${GREEN}✓ All required NextAuth environment variables are set${NC}"
else
    echo -e "${RED}✗ Some NextAuth environment variables are missing${NC}"
    echo -e "${YELLOW}  Action: Set missing variables in Azure Portal → Container Apps → Configuration${NC}"
fi
echo ""

if [ -z "$LEGACY_MISSING" ]; then
    echo -e "${GREEN}✓ All legacy Azure AD variables are set (backward compatibility)${NC}"
else
    echo -e "${YELLOW}⚠ Some legacy Azure AD variables are missing (may affect custom auth flow)${NC}"
fi
echo ""

# Check Azure AD App Registration (requires Microsoft Graph API permissions)
echo "========================================="
echo "Azure AD App Registration Verification"
echo "========================================="
echo ""

echo "To verify redirect URIs in Azure Portal:"
echo "1. Go to: https://portal.azure.com"
echo "2. Navigate to: Azure Active Directory → App Registrations"
echo "3. Find app: GreenChainz (Client ID: $CLIENT_ID)"
echo "4. Click: Authentication"
echo "5. Verify these redirect URIs are present:"
echo ""
echo "   Required URIs:"
echo "   - https://greenchainz.com/api/auth/callback/microsoft-entra-id"
echo "   - https://www.greenchainz.com/api/auth/callback/microsoft-entra-id"
echo "   - https://$FQDN/api/auth/callback/microsoft-entra-id"
echo "   - https://greenchainz.com/api/auth/callback"
echo "   - https://www.greenchainz.com/api/auth/callback"
echo "   - https://$FQDN/api/auth/callback"
echo ""

echo "========================================="
echo "Next Steps"
echo "========================================="
echo ""

if [ -z "$MISSING" ]; then
    echo "1. Verify redirect URIs in Azure Portal (see above)"
    echo "2. Test login at: https://$FQDN/login"
    echo "3. Monitor logs: az containerapp logs show --name $APP_NAME --resource-group $RESOURCE_GROUP --tail 50"
else
    echo "1. Set missing environment variables in Azure Portal"
    echo "2. Restart container app: az containerapp restart --name $APP_NAME --resource-group $RESOURCE_GROUP"
    echo "3. Verify redirect URIs in Azure Portal"
    echo "4. Test login at: https://$FQDN/login"
fi

echo ""
echo "For detailed instructions, see: docs/AZURE_AD_FIX.md"
echo ""
