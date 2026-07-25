#!/usr/bin/env bash
###############################################################################
# GreenChainz Manual Deployment Script
#
# Usage:
#   ./deploy.sh                  # deploy both frontend + backend using latest
#   IMAGE_TAG=abc1234 ./deploy.sh
#
# Prerequisites: az login, docker
###############################################################################

set -euo pipefail

# ── Configuration (override any via env vars) ─────────────────────────────────
RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-rg-greenchainz-prod-container}"
REGISTRY_NAME="${AZURE_REGISTRY_NAME:-acrgreenchainzprod916}"
TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD 2>/dev/null || echo "latest")}"

REGISTRY_URL="${REGISTRY_NAME}.azurecr.io"
BACKEND_APP="greenchainz-backend-v2"
FRONTEND_APP="greenchainz-frontend"
BACKEND_IMAGE="greenchainz-backend"
FRONTEND_IMAGE="greenchainz-frontend"

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  GreenChainz Deployment  |  Started: $(date)${NC}"
echo -e "${BLUE}  Resource Group : ${RESOURCE_GROUP}${NC}"
echo -e "${BLUE}  Registry       : ${REGISTRY_URL}${NC}"
echo -e "${BLUE}  Tag            : ${TAG}${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}\n"

# ── Step 1: Verify Azure CLI auth ─────────────────────────────────────────────
echo -e "${YELLOW}[1/5] Checking Azure CLI authentication...${NC}"
if ! az account show >/dev/null 2>&1; then
    echo -e "${RED}❌ Not logged in. Run: az login${NC}"; exit 1
fi
SUBSCRIPTION=$(az account show --query name -o tsv)
echo -e "${GREEN}✅ Subscription: ${SUBSCRIPTION}${NC}\n"

# ── Step 2: Authenticate to ACR ───────────────────────────────────────────────
echo -e "${YELLOW}[2/5] Logging into ACR...${NC}"
az acr login --name "${REGISTRY_NAME}"
echo -e "${GREEN}✅ ACR login successful${NC}\n"

# ── Step 3: Build Docker images ───────────────────────────────────────────────
echo -e "${YELLOW}[3/5] Building Docker images...${NC}"
docker build \
  -t "${REGISTRY_URL}/${BACKEND_IMAGE}:${TAG}" \
  -t "${REGISTRY_URL}/${BACKEND_IMAGE}:latest" \
  -f Dockerfile.backend .

docker build \
  -t "${REGISTRY_URL}/${FRONTEND_IMAGE}:${TAG}" \
  -t "${REGISTRY_URL}/${FRONTEND_IMAGE}:latest" \
  -f Dockerfile.frontend .
echo -e "${GREEN}✅ Images built${NC}\n"

# ── Step 4: Push images ───────────────────────────────────────────────────────
echo -e "${YELLOW}[4/5] Pushing images to registry...${NC}"
docker push "${REGISTRY_URL}/${BACKEND_IMAGE}:${TAG}"
docker push "${REGISTRY_URL}/${BACKEND_IMAGE}:latest"
docker push "${REGISTRY_URL}/${FRONTEND_IMAGE}:${TAG}"
docker push "${REGISTRY_URL}/${FRONTEND_IMAGE}:latest"
echo -e "${GREEN}✅ Images pushed${NC}\n"

# ── Step 5: Update Container Apps ────────────────────────────────────────────
echo -e "${YELLOW}[5/5] Updating Container Apps...${NC}"
az containerapp update \
  --name "${BACKEND_APP}" \
  --resource-group "${RESOURCE_GROUP}" \
  --image "${REGISTRY_URL}/${BACKEND_IMAGE}:${TAG}"

az containerapp update \
  --name "${FRONTEND_APP}" \
  --resource-group "${RESOURCE_GROUP}" \
  --image "${REGISTRY_URL}/${FRONTEND_IMAGE}:${TAG}"
echo -e "${GREEN}✅ Container Apps updated${NC}\n"

# ── Post-deploy health check ──────────────────────────────────────────────────
echo -e "${BLUE}Waiting 30s for containers to settle...${NC}"
sleep 30

BACKEND_FQDN=$(az containerapp show \
  --name "${BACKEND_APP}" \
  --resource-group "${RESOURCE_GROUP}" \
  --query properties.configuration.ingress.fqdn -o tsv 2>/dev/null || echo "")

if [ -n "$BACKEND_FQDN" ]; then
  echo -e "${BLUE}Health check: https://${BACKEND_FQDN}/health${NC}"
  curl -sf "https://${BACKEND_FQDN}/health" && echo -e "\n${GREEN}✅ Backend healthy${NC}" \
    || echo -e "\n${YELLOW}⚠️  Health check did not return 2xx (app may still be starting)${NC}"
fi

echo -e "\n${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Deployment complete — ${TAG}${NC}"
echo -e "${BLUE}  Finished: $(date)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "\n${YELLOW}Monitor logs:${NC}"
echo -e "  az containerapp logs show --name ${BACKEND_APP} --resource-group ${RESOURCE_GROUP} --follow"
echo -e "  az containerapp revision list --name ${BACKEND_APP} --resource-group ${RESOURCE_GROUP} -o table"
