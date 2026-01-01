#!/bin/bash
# GreenChainz Azure Infrastructure Setup
# Run this ONCE to set up all Azure resources
# Prerequisites: Azure CLI installed and logged in

set -e

# Configuration
SUBSCRIPTION="greenchainz-core-start"
LOCATION="eastus"
RESOURCE_GROUP="rg-greenchainz-prod-container"
ACR_NAME="acrgreenchainzprod916"
CONTAINER_ENV="cae-greenchainz-env"
KEY_VAULT="greenchianz-vault"
REDIS_NAME="greenchainz"
REDIS_RG="greenchainz-production"
LOG_ANALYTICS="workspace-rggreenchainzprodcontainer5PZ8"
APP_INSIGHTS="greenchainz-platform"
STORAGE_ACCOUNT="revitfiles"

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
echo "║      GreenChainz Azure Infrastructure Setup                ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check Azure CLI
if ! command -v az &> /dev/null; then
    echo_error "Azure CLI not found. Install from: https://aka.ms/installazurecli"
    exit 1
fi

# Login check
if ! az account show &> /dev/null; then
    echo_info "Logging into Azure..."
    az login
fi

# Set subscription
echo_info "Setting subscription to: $SUBSCRIPTION"
az account set --subscription "$SUBSCRIPTION"

# =====================================================
# 1. Resource Group (if not exists)
# =====================================================
echo_info "Checking resource group..."
if ! az group show --name $RESOURCE_GROUP &> /dev/null; then
    echo_info "Creating resource group: $RESOURCE_GROUP"
    az group create --name $RESOURCE_GROUP --location $LOCATION
fi
echo_success "Resource group ready: $RESOURCE_GROUP"

# =====================================================
# 2. Log Analytics Workspace (for Container Apps)
# =====================================================
echo_info "Checking Log Analytics workspace..."
LOG_ANALYTICS_ID=$(az monitor log-analytics workspace show \
    --resource-group $RESOURCE_GROUP \
    --workspace-name $LOG_ANALYTICS \
    --query "customerId" -o tsv 2>/dev/null || echo "")

if [ -z "$LOG_ANALYTICS_ID" ]; then
    echo_info "Creating Log Analytics workspace..."
    az monitor log-analytics workspace create \
        --resource-group $RESOURCE_GROUP \
        --workspace-name $LOG_ANALYTICS \
        --location $LOCATION
    
    LOG_ANALYTICS_ID=$(az monitor log-analytics workspace show \
        --resource-group $RESOURCE_GROUP \
        --workspace-name $LOG_ANALYTICS \
        --query "customerId" -o tsv)
fi
echo_success "Log Analytics ready: $LOG_ANALYTICS_ID"

# =====================================================
# 3. Container Apps Environment
# =====================================================
echo_info "Checking Container Apps environment..."
if ! az containerapp env show --name $CONTAINER_ENV --resource-group $RESOURCE_GROUP &> /dev/null; then
    echo_info "Creating Container Apps environment..."
    
    LOG_ANALYTICS_KEY=$(az monitor log-analytics workspace get-shared-keys \
        --resource-group $RESOURCE_GROUP \
        --workspace-name $LOG_ANALYTICS \
        --query "primarySharedKey" -o tsv)
    
    az containerapp env create \
        --name $CONTAINER_ENV \
        --resource-group $RESOURCE_GROUP \
        --location $LOCATION \
        --logs-workspace-id $LOG_ANALYTICS_ID \
        --logs-workspace-key $LOG_ANALYTICS_KEY
fi
echo_success "Container Apps environment ready: $CONTAINER_ENV"

# =====================================================
# 4. Container Registry
# =====================================================
echo_info "Checking Container Registry..."
if ! az acr show --name $ACR_NAME &> /dev/null; then
    echo_info "Creating Container Registry..."
    az acr create \
        --name $ACR_NAME \
        --resource-group $RESOURCE_GROUP \
        --sku Basic \
        --admin-enabled true
fi
echo_success "Container Registry ready: ${ACR_NAME}.azurecr.io"

# =====================================================
# 5. Create Backend Container App
# =====================================================
echo_info "Checking Backend Container App..."
if ! az containerapp show --name greenchainz-container --resource-group $RESOURCE_GROUP &> /dev/null; then
    echo_info "Creating Backend Container App..."
    
    # Get ACR credentials
    ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query "username" -o tsv)
    ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)
    
    az containerapp create \
        --name greenchainz-container \
        --resource-group $RESOURCE_GROUP \
        --environment $CONTAINER_ENV \
        --image mcr.microsoft.com/azuredocs/containerapps-helloworld:latest \
        --target-port 3001 \
        --ingress external \
        --min-replicas 1 \
        --max-replicas 10 \
        --cpu 0.5 \
        --memory 1Gi \
        --registry-server ${ACR_NAME}.azurecr.io \
        --registry-username $ACR_USERNAME \
        --registry-password $ACR_PASSWORD \
        --system-assigned
    
    echo_info "Enabling managed identity..."
    az containerapp identity assign \
        --name greenchainz-container \
        --resource-group $RESOURCE_GROUP \
        --system-assigned
fi
echo_success "Backend Container App ready"

# =====================================================
# 6. Key Vault Access
# =====================================================
echo_info "Configuring Key Vault access..."

# Get managed identity principal ID
PRINCIPAL_ID=$(az containerapp show \
    --name greenchainz-container \
    --resource-group $RESOURCE_GROUP \
    --query "identity.principalId" -o tsv 2>/dev/null || echo "")

if [ -n "$PRINCIPAL_ID" ]; then
    # Grant Key Vault access
    az keyvault set-policy \
        --name $KEY_VAULT \
        --object-id $PRINCIPAL_ID \
        --secret-permissions get list \
        2>/dev/null || echo_warn "Key Vault policy may need manual configuration"
    
    echo_success "Key Vault access configured"
else
    echo_warn "Managed identity not found. Configure Key Vault access manually."
fi

# =====================================================
# 7. Storage Container
# =====================================================
echo_info "Checking Storage container..."
az storage container create \
    --name greenchainz-uploads \
    --account-name $STORAGE_ACCOUNT \
    --public-access blob \
    2>/dev/null || echo_warn "Storage container may already exist"
echo_success "Storage container ready"

# =====================================================
# Summary
# =====================================================
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                   Setup Complete!                          ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Resources configured:"
echo "  ✅ Resource Group: $RESOURCE_GROUP"
echo "  ✅ Container Registry: ${ACR_NAME}.azurecr.io"
echo "  ✅ Container Apps Environment: $CONTAINER_ENV"
echo "  ✅ Backend Container App: greenchainz-container"
echo "  ✅ Key Vault: $KEY_VAULT"
echo "  ✅ Storage: $STORAGE_ACCOUNT"
echo ""
echo "Existing resources (already configured):"
echo "  📦 Redis Cache: $REDIS_NAME ($REDIS_RG)"
echo "  📊 Application Insights: $APP_INSIGHTS"
echo "  🧠 Document Intelligence: greenchainz-content-intel"
echo ""
echo "Next steps:"
echo "  1. Add secrets to Key Vault:"
echo "     az keyvault secret set --vault-name $KEY_VAULT --name postgres-password --value 'YOUR_PASSWORD'"
echo "     az keyvault secret set --vault-name $KEY_VAULT --name jwt-secret --value 'YOUR_JWT_SECRET'"
echo ""
echo "  2. Build and deploy your application:"
echo "     ./azure/deploy.sh all"
echo ""
