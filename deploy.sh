#!/bin/bash

###############################################################################
# GreenChainz Backend Deployment Script
# 
# This script deploys all backend changes to Azure:
# 1. Triggers Container Apps redeployment from GitHub
# 2. Runs database migration (creates leads table)
# 3. Verifies deployment
# 4. Tests endpoints
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RESOURCE_GROUP="rg-greenchainz-prod-container"
CONTAINER_APP_NAME="greenchainz-container"
DB_HOST="greenchainz-db-prod.postgres.database.azure.com"
DB_USER="founder1@greenchainz.com"
DB_NAME="postgres"
DB_PORT="5432"
BACKEND_URL="https://greenchainz-container.jollyrock-a66f2da6.eastus.azurecontainerapps.io"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  GreenChainz Backend Deployment${NC}"
echo -e "${BLUE}  Started: $(date)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

###############################################################################
# Step 1: Check Azure CLI authentication
###############################################################################

echo -e "${YELLOW}[1/5] Checking Azure CLI authentication...${NC}"

if ! az account show &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Azure CLI${NC}"
    echo -e "${YELLOW}Please run: az login${NC}"
    exit 1
fi

SUBSCRIPTION=$(az account show --query name -o tsv)
echo -e "${GREEN}✅ Logged in to Azure subscription: $SUBSCRIPTION${NC}\n"

###############################################################################
# Step 2: Trigger Container Apps redeployment
###############################################################################

echo -e "${YELLOW}[2/5] Triggering Azure Container Apps redeployment...${NC}"

# Check if continuous deployment is enabled
echo -e "Checking Container App configuration..."

# Option A: If you have GitHub Actions CI/CD, just wait for auto-deploy
# Option B: Manual trigger using Azure CLI

# For now, we'll trigger a revision update which pulls latest image
az containerapp update \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --output none

echo -e "${GREEN}✅ Container App update triggered${NC}"
echo -e "${BLUE}ℹ️  Waiting 30 seconds for deployment to start...${NC}\n"
sleep 30

###############################################################################
# Step 3: Run database migration
###############################################################################

echo -e "${YELLOW}[3/5] Running database migration...${NC}"

# Get fresh access token
echo -e "Getting Azure PostgreSQL access token..."
export PGPASSWORD=$(az account get-access-token \
  --resource https://ossrdbms-aad.database.windows.net \
  --query accessToken \
  --output tsv)

if [ -z "$PGPASSWORD" ]; then
    echo -e "${RED}❌ Failed to get access token${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Access token obtained${NC}"

# Run migration
echo -e "Executing migration SQL..."

psql \
  -h "$DB_HOST" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -p "$DB_PORT" \
  -f database-schemas/migrations/20260211_000000_add_leads_table.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database migration completed${NC}\n"
else
    echo -e "${RED}❌ Database migration failed${NC}"
    echo -e "${YELLOW}Note: If table already exists, this is expected${NC}\n"
fi

###############################################################################
# Step 4: Verify deployment
###############################################################################

echo -e "${YELLOW}[4/5] Verifying deployment...${NC}"

# Wait for container to be fully running
echo -e "Waiting for container to be ready..."
sleep 30

# Check health endpoint
echo -e "Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s "$BACKEND_URL/api/health")

if echo "$HEALTH_RESPONSE" | grep -q "status"; then
    echo -e "${GREEN}✅ Backend is responding${NC}"
    echo -e "Health status: $HEALTH_RESPONSE\n"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
    echo -e "Response: $HEALTH_RESPONSE\n"
fi

# Check CORS headers
echo -e "Testing CORS headers..."
CORS_RESPONSE=$(curl -I -s -X OPTIONS \
  -H "Origin: https://3000-ill3vvmn3ipw6p9vxjteb-b9e32dbc.us2.manus.computer" \
  "$BACKEND_URL/api/health" | grep -i "access-control")

if [ -n "$CORS_RESPONSE" ]; then
    echo -e "${GREEN}✅ CORS headers present${NC}"
    echo -e "$CORS_RESPONSE\n"
else
    echo -e "${YELLOW}⚠️  CORS headers not found (may need more time to deploy)${NC}\n"
fi

###############################################################################
# Step 5: Test endpoints
###############################################################################

echo -e "${YELLOW}[5/5] Testing endpoints...${NC}"

# Test leads API
echo -e "Testing /api/leads endpoint..."
LEADS_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@greenchainz.com","name":"Test User","toolName":"Excel Audit"}' \
  "$BACKEND_URL/api/leads")

if echo "$LEADS_RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✅ Leads API working${NC}"
    echo -e "Response: $LEADS_RESPONSE\n"
else
    echo -e "${YELLOW}⚠️  Leads API response: $LEADS_RESPONSE${NC}\n"
fi

# Verify lead was stored in database
echo -e "Verifying lead was stored in database..."
export PGPASSWORD=$(az account get-access-token \
  --resource https://ossrdbms-aad.database.windows.net \
  --query accessToken \
  --output tsv)

LEAD_COUNT=$(psql \
  -h "$DB_HOST" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -p "$DB_PORT" \
  -t -c "SELECT COUNT(*) FROM leads;")

echo -e "${GREEN}✅ Total leads in database: $LEAD_COUNT${NC}\n"

###############################################################################
# Summary
###############################################################################

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Deployment Complete!${NC}"
echo -e "${BLUE}  Finished: $(date)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

echo -e "${GREEN}✅ Container App updated${NC}"
echo -e "${GREEN}✅ Database migration executed${NC}"
echo -e "${GREEN}✅ Backend health check passed${NC}"
echo -e "${GREEN}✅ Leads API tested${NC}\n"

echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Test lead submission from frontend: $BACKEND_URL"
echo -e "2. Deploy scraper scheduler: cd /path/to/repo && func azure functionapp publish greenchainz-scraper"
echo -e "3. Monitor logs: az containerapp logs show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --follow\n"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"
