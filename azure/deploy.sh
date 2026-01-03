#!/bin/bash
# GreenChainz Azure Deployment Script
# Usage: ./azure/deploy.sh [backend|frontend|all]

set -e

# Configuration - Update these values
RESOURCE_GROUP="rg-greenchainz-prod-container"
ACR_NAME="acrgreenchainzprod916"
ACR_LOGIN_SERVER="${ACR_NAME}.azurecr.io"
CONTAINER_ENV="cae-greenchainz-env"
LOCATION="eastus"
KEY_VAULT="greenchianz-vault"

# Image tags
BACKEND_IMAGE="${ACR_LOGIN_SERVER}/greenchainz-backend"
FRONTEND_IMAGE="${ACR_LOGIN_SERVER}/greenchainz-frontend"
TAG="${TAG:-latest}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
echo_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
echo_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
echo_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check prerequisites
check_prerequisites() {
    echo_info "Checking prerequisites..."
    
    if ! command -v az &> /dev/null; then
        echo_error "Azure CLI not found. Install from: https://aka.ms/installazurecli"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        echo_error "Docker not found. Please install Docker."
        exit 1
    fi
    
    # Check Azure login
    if ! az account show &> /dev/null; then
        echo_warn "Not logged into Azure. Running 'az login'..."
        az login
    fi
    
    echo_success "Prerequisites check passed"
}

# Login to ACR
acr_login() {
    echo_info "Logging into Azure Container Registry..."
    az acr login --name $ACR_NAME
    echo_success "ACR login successful"
}

# Build and push backend
deploy_backend() {
    echo_info "Building backend image..."
    
    # Build from repository root
    docker build \
        -f backend/Dockerfile.azure \
        -t ${BACKEND_IMAGE}:${TAG} \
        -t ${BACKEND_IMAGE}:$(date +%Y%m%d-%H%M%S) \
        .
    
    echo_info "Pushing backend image to ACR..."
    docker push ${BACKEND_IMAGE}:${TAG}
    
    echo_info "Deploying backend to Container Apps..."
    
    az containerapp update \
        --name greenchainz-container \
        --resource-group $RESOURCE_GROUP \
        --image ${BACKEND_IMAGE}:${TAG}
    
    echo_success "Backend deployed successfully!"
    
    # Get the URL
    BACKEND_URL=$(az containerapp show \
        --name greenchainz-container \
        --resource-group $RESOURCE_GROUP \
        --query "properties.configuration.ingress.fqdn" -o tsv)
    
    echo_info "Backend URL: https://${BACKEND_URL}"
}

# Build and push frontend
deploy_frontend() {
    echo_info "Building frontend image..."
    
    # Get backend URL for build args
    BACKEND_URL=$(az containerapp show \
        --name greenchainz-container \
        --resource-group $RESOURCE_GROUP \
        --query "properties.configuration.ingress.fqdn" -o tsv 2>/dev/null || echo "")
    
    if [ -z "$BACKEND_URL" ]; then
        BACKEND_URL="greenchainz-container.${LOCATION}.azurecontainerapps.io"
    fi
    
    # Build from repository root
    docker build \
        -f Dockerfile \
        --build-arg NEXT_PUBLIC_BACKEND_URL=https://${BACKEND_URL} \
        --build-arg NEXT_PUBLIC_AZURE_TENANT=${NEXT_PUBLIC_AZURE_TENANT:-"greenchainz2025.onmicrosoft.com"} \
        --build-arg NEXT_PUBLIC_AZURE_CLIENT_ID=${NEXT_PUBLIC_AZURE_CLIENT_ID:-""} \
        -t ${FRONTEND_IMAGE}:${TAG} \
        -t ${FRONTEND_IMAGE}:$(date +%Y%m%d-%H%M%S) \
        .
    
    echo_info "Pushing frontend image to ACR..."
    docker push ${FRONTEND_IMAGE}:${TAG}
    
    echo_info "Deploying frontend to Container Apps..."
    
    # Check if frontend container app exists
    if az containerapp show --name greenchainz-frontend --resource-group $RESOURCE_GROUP &> /dev/null; then
        az containerapp update \
            --name greenchainz-frontend \
            --resource-group $RESOURCE_GROUP \
            --image ${FRONTEND_IMAGE}:${TAG}
    else
        echo_info "Creating new frontend Container App..."
        az containerapp create \
            --name greenchainz-frontend \
            --resource-group $RESOURCE_GROUP \
            --environment $CONTAINER_ENV \
            --image ${FRONTEND_IMAGE}:${TAG} \
            --target-port 3000 \
            --ingress external \
            --min-replicas 1 \
            --max-replicas 5 \
            --cpu 0.25 \
            --memory 0.5Gi \
            --registry-server $ACR_LOGIN_SERVER \
            --registry-identity system
    fi
    
    echo_success "Frontend deployed successfully!"
    
    # Get the URL
    FRONTEND_URL=$(az containerapp show \
        --name greenchainz-frontend \
        --resource-group $RESOURCE_GROUP \
        --query "properties.configuration.ingress.fqdn" -o tsv)
    
    echo_info "Frontend URL: https://${FRONTEND_URL}"
}

# Setup Key Vault secrets
setup_keyvault() {
    echo_info "Setting up Key Vault secrets..."
    
    # Prompt for secrets if not set
    if [ -z "$DB_PASSWORD" ]; then
        read -sp "Enter database password: " DB_PASSWORD
        echo
    fi
    
    if [ -z "$JWT_SECRET" ]; then
        JWT_SECRET=$(openssl rand -base64 32)
        echo_info "Generated JWT secret"
    fi
    
    if [ -z "$SESSION_SECRET" ]; then
        SESSION_SECRET=$(openssl rand -base64 32)
        echo_info "Generated session secret"
    fi
    
    # Set secrets in Key Vault
    az keyvault secret set --vault-name $KEY_VAULT --name postgres-password --value "$DB_PASSWORD" > /dev/null
    az keyvault secret set --vault-name $KEY_VAULT --name jwt-secret --value "$JWT_SECRET" > /dev/null
    az keyvault secret set --vault-name $KEY_VAULT --name session-secret --value "$SESSION_SECRET" > /dev/null
    
    echo_success "Key Vault secrets configured"
}

# Grant managed identity access to Key Vault
setup_managed_identity() {
    echo_info "Setting up managed identity access..."
    
    # Get the Container App's managed identity principal ID
    PRINCIPAL_ID=$(az containerapp show \
        --name greenchainz-container \
        --resource-group $RESOURCE_GROUP \
        --query "identity.principalId" -o tsv)
    
    if [ -n "$PRINCIPAL_ID" ]; then
        # Grant Key Vault access
        az keyvault set-policy \
            --name $KEY_VAULT \
            --object-id $PRINCIPAL_ID \
            --secret-permissions get list \
            > /dev/null
        
        echo_success "Managed identity configured for Key Vault access"
    else
        echo_warn "Could not get managed identity. Enable it manually."
    fi
}

# Show deployment status
show_status() {
    echo_info "Deployment Status:"
    echo ""
    
    echo "Backend Container App:"
    az containerapp show \
        --name greenchainz-container \
        --resource-group $RESOURCE_GROUP \
        --query "{Name:name, Status:properties.runningStatus, URL:properties.configuration.ingress.fqdn, Replicas:properties.template.scale}" \
        -o table 2>/dev/null || echo "  Not deployed"
    
    echo ""
    echo "Frontend Container App:"
    az containerapp show \
        --name greenchainz-frontend \
        --resource-group $RESOURCE_GROUP \
        --query "{Name:name, Status:properties.runningStatus, URL:properties.configuration.ingress.fqdn}" \
        -o table 2>/dev/null || echo "  Not deployed"
    
    echo ""
    echo "Redis Cache:"
    az redis show \
        --name greenchainz \
        --resource-group greenchainz-production \
        --query "{Name:name, Status:provisioningState, Host:hostName}" \
        -o table 2>/dev/null || echo "  Not found"
}

# View logs
view_logs() {
    local app_name=${1:-greenchainz-container}
    echo_info "Viewing logs for $app_name..."
    
    az containerapp logs show \
        --name $app_name \
        --resource-group $RESOURCE_GROUP \
        --follow
}

# Main
main() {
    local command=${1:-all}
    
    echo ""
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║          GreenChainz Azure Deployment                      ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo ""
    
    check_prerequisites
    
    case $command in
        backend)
            acr_login
            deploy_backend
            ;;
        frontend)
            acr_login
            deploy_frontend
            ;;
        all)
            acr_login
            deploy_backend
            deploy_frontend
            show_status
            ;;
        setup)
            setup_keyvault
            setup_managed_identity
            ;;
        status)
            show_status
            ;;
        logs)
            view_logs ${2}
            ;;
        *)
            echo "Usage: $0 [backend|frontend|all|setup|status|logs [app-name]]"
            echo ""
            echo "Commands:"
            echo "  backend   - Build and deploy backend only"
            echo "  frontend  - Build and deploy frontend only"
            echo "  all       - Build and deploy both (default)"
            echo "  setup     - Configure Key Vault secrets and managed identity"
            echo "  status    - Show deployment status"
            echo "  logs      - View container logs (optional: specify app name)"
            exit 1
            ;;
    esac
    
    echo ""
    echo_success "Deployment complete!"
}

main "$@"
