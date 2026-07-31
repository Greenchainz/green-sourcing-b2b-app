#!/bin/bash
# GreenChainz Azure Deployment Script
# Usage: ./azure/deploy.sh [backend|frontend|all|setup|status|logs [app-name]]
#
# Emergency manual deploy. Standard releases use release-production.yml.
# Builds two separate container images (backend API, frontend SPA) and
# deploys each to its own Container App.

set -e

# Configuration
RESOURCE_GROUP="rg-greenchainz-prod-container"
ACR_NAME="acrgreenchainzprod916"
ACR_LOGIN_SERVER="${ACR_NAME}.azurecr.io"
CONTAINER_ENV="cae-greenchainz-env"
LOCATION="eastus"
KEY_VAULT="greenchainz-vault"

# Images and Container App names
BACKEND_IMAGE="${ACR_LOGIN_SERVER}/greenchainz-backend"
FRONTEND_IMAGE="${ACR_LOGIN_SERVER}/greenchainz-frontend"
TAG="${TAG:-latest}"
BACKEND_APP_NAME="greenchainz-backend-v2"
FRONTEND_APP_NAME="greenchainz-frontend"

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

# Build and deploy backend (API server — Dockerfile.backend)
deploy_backend() {
    echo_info "Building backend image..."
    docker build \
        -f Dockerfile.backend \
        -t "${BACKEND_IMAGE}:${TAG}" \
        -t "${BACKEND_IMAGE}:$(date +%Y%m%d-%H%M%S)" \
        .

    echo_info "Pushing backend image to ACR..."
    docker push "${BACKEND_IMAGE}:${TAG}"

    echo_info "Deploying backend to Container App ${BACKEND_APP_NAME}..."
    az containerapp update \
        --name "${BACKEND_APP_NAME}" \
        --resource-group "${RESOURCE_GROUP}" \
        --image "${BACKEND_IMAGE}:${TAG}"

    echo_success "Backend deployed successfully!"

    BACKEND_FQDN=$(az containerapp show \
        --name "${BACKEND_APP_NAME}" \
        --resource-group "${RESOURCE_GROUP}" \
        --query "properties.configuration.ingress.fqdn" -o tsv)
    echo_info "Backend URL: https://${BACKEND_FQDN}"
}

# Build and deploy frontend (Vite SPA — Dockerfile.frontend)
deploy_frontend() {
    echo_info "Building frontend image..."

    # VITE_BACKEND_URL is intentionally left empty: the frontend makes same-origin
    # API requests to greenchainz.com, which proxies to the backend. Setting this
    # to the backend Container Apps FQDN would break auth because the session cookie
    # is scoped to greenchainz.com and is not sent cross-origin to the ACA host.
    docker build \
        -f Dockerfile.frontend \
        --build-arg VITE_BACKEND_URL="" \
        --build-arg VITE_FRONTEND_WEBPUBSUB_ENDPOINT="${VITE_FRONTEND_WEBPUBSUB_ENDPOINT:-https://greenchainz.webpubsub.azure.com}" \
        --build-arg VITE_FRONTEND_WEBPUBSUB_HUB="${VITE_FRONTEND_WEBPUBSUB_HUB:-greenchainzhub}" \
        --build-arg VITE_AZURE_MAPS_KEY="${VITE_AZURE_MAPS_KEY:-}" \
        -t "${FRONTEND_IMAGE}:${TAG}" \
        -t "${FRONTEND_IMAGE}:$(date +%Y%m%d-%H%M%S)" \
        .

    echo_info "Pushing frontend image to ACR..."
    docker push "${FRONTEND_IMAGE}:${TAG}"

    echo_info "Deploying frontend to Container App ${FRONTEND_APP_NAME}..."
    az containerapp update \
        --name "${FRONTEND_APP_NAME}" \
        --resource-group "${RESOURCE_GROUP}" \
        --image "${FRONTEND_IMAGE}:${TAG}"

    echo_success "Frontend deployed successfully!"

    FRONTEND_FQDN=$(az containerapp show \
        --name "${FRONTEND_APP_NAME}" \
        --resource-group "${RESOURCE_GROUP}" \
        --query "properties.configuration.ingress.fqdn" -o tsv)
    echo_info "Frontend URL: https://${FRONTEND_FQDN}"
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
        --name "${BACKEND_APP_NAME}" \
        --resource-group "${RESOURCE_GROUP}" \
        --query "identity.principalId" -o tsv)

    if [ -z "$PRINCIPAL_ID" ]; then
        echo_error "No managed identity on ${BACKEND_APP_NAME}. Enable system-assigned identity first."
        exit 1
    fi

    KV_ID=$(az keyvault show --name "${KEY_VAULT}" --query id -o tsv)

    # Check for an existing assignment to keep this operation idempotent
    EXISTING=$(az role assignment list \
        --assignee "$PRINCIPAL_ID" \
        --role "Key Vault Secrets User" \
        --scope "$KV_ID" \
        --query "length(@)" -o tsv 2>/dev/null || echo "0")

    if [ "$EXISTING" -gt 0 ]; then
        echo_info "Key Vault Secrets User role already assigned — skipping."
    else
        echo_info "Granting Key Vault Secrets User role..."
        az role assignment create \
            --assignee-object-id "$PRINCIPAL_ID" \
            --assignee-principal-type ServicePrincipal \
            --role "Key Vault Secrets User" \
            --scope "$KV_ID" \
            > /dev/null || {
                echo_error "Failed to grant Key Vault access to ${PRINCIPAL_ID}."
                return 1
            }
        echo_success "Managed identity configured for Key Vault access"
    fi
}

# Show deployment status
show_status() {
    echo_info "Deployment Status:"
    echo ""

    echo "Backend Container App:"
    az containerapp show \
        --name "${BACKEND_APP_NAME}" \
        --resource-group "${RESOURCE_GROUP}" \
        --query "{Name:name, Status:properties.runningStatus, URL:properties.configuration.ingress.fqdn, Replicas:properties.template.scale}" \
        -o table 2>/dev/null || echo "  Not deployed"

    echo ""
    echo "Frontend Container App:"
    az containerapp show \
        --name "${FRONTEND_APP_NAME}" \
        --resource-group "${RESOURCE_GROUP}" \
        --query "{Name:name, Status:properties.runningStatus, URL:properties.configuration.ingress.fqdn}" \
        -o table 2>/dev/null || echo "  Not deployed"
}

# View logs
view_logs() {
    local app_name=${1:-${BACKEND_APP_NAME}}
    echo_info "Viewing logs for $app_name..."

    az containerapp logs show \
        --name "$app_name" \
        --resource-group "${RESOURCE_GROUP}" \
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
            view_logs "${2}"
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
