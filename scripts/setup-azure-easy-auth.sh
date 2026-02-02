#!/bin/bash

# Azure Container Apps Easy Auth Setup Script
# This configures Microsoft Entra ID authentication for your container app

set -e

echo "🔐 Setting up Azure Container Apps Easy Auth for Microsoft Entra ID"
echo ""

# Required variables - YOU MUST SET THESE
RESOURCE_GROUP="rg-greenchainz-prod-container"
APP_NAME="greenchainz-frontend"
CLIENT_ID="${AZURE_CLIENT_ID}"  # Set this environment variable
CLIENT_SECRET="${AZURE_CLIENT_SECRET}"  # Set this environment variable  
TENANT_ID="${AZURE_TENANT_ID}"  # Set this environment variable

if [ -z "$CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ] || [ -z "$TENANT_ID" ]; then
  echo "❌ ERROR: Missing required environment variables"
  echo ""
  echo "Please set:"
  echo "  export AZURE_CLIENT_ID='your-client-id'"
  echo "  export AZURE_CLIENT_SECRET='your-client-secret'"
  echo "  export AZURE_TENANT_ID='your-tenant-id'"
  echo ""
  exit 1
fi

echo "📋 Configuration:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  App Name: $APP_NAME"
echo "  Client ID: $CLIENT_ID"
echo "  Tenant ID: $TENANT_ID"
echo ""

# Step 1: Create secret for client secret
echo "🔑 Step 1: Creating secret for Microsoft client secret..."
az containerapp secret set \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --secrets microsoft-provider-authentication-secret="$CLIENT_SECRET"

echo "✅ Secret created"
echo ""

# Step 2: Enable Microsoft authentication
echo "🔐 Step 2: Enabling Microsoft Entra ID authentication..."
az containerapp auth microsoft update \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --client-id "$CLIENT_ID" \
  --client-secret-setting-name "microsoft-provider-authentication-secret" \
  --issuer "https://login.microsoftonline.com/$TENANT_ID/v2.0" \
  --allowed-audiences "api://$CLIENT_ID" \
  --yes

echo "✅ Microsoft authentication enabled"
echo ""

# Step 3: Configure auth settings
echo "⚙️  Step 3: Configuring authentication settings..."
az containerapp auth update \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --enabled true \
  --unauthenticated-client-action RedirectToLoginPage \
  --redirect-provider microsoft

echo "✅ Authentication settings configured"
echo ""

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Go to Azure Portal > App Registrations"
echo "2. Find your app registration (Client ID: $CLIENT_ID)"
echo "3. Go to Authentication > Add a platform > Web"
echo "4. Add redirect URI: https://greenchainz.com/.auth/login/microsoft/callback"
echo "5. Save the configuration"
echo ""
echo "Then test login at: https://greenchainz.com/login"
