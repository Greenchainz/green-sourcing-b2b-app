# Migration Guide: Azure Function App → Container App

**Purpose:** Guide for converting Azure Function App deployments to Azure Container Apps  
**Context:** Migrating from `main_greenchainz-scraper.yml` (Function App) to Container App deployment  
**Last Updated:** 2026-02-05

---

## 🎯 Overview

This guide helps you convert an Azure Function App deployment workflow to an Azure Container App deployment workflow. This migration is necessary when:

1. Your application uses containerization instead of traditional Azure Functions
2. You need more control over the runtime environment
3. You're consolidating from multiple Azure services to Container Apps
4. Your codebase doesn't follow Azure Functions structure (no `host.json`, `function.json`)

---

## 📋 Prerequisites

Before starting the migration:

- [ ] Verify Azure Container App resource exists (or create one)
- [ ] Have Azure Container Registry credentials
- [ ] Create or verify Dockerfile for your application
- [ ] Ensure Node.js version >=20.0.0 (Azure SDK requirement)
- [ ] Review secrets needed for authentication

---

## 🔄 Key Differences

### Function App vs Container App

| Aspect | Azure Function App | Azure Container App |
|--------|-------------------|---------------------|
| **Deployment Unit** | Zip file with Function code | Container image |
| **Code Structure** | Functions with `host.json`, `function.json` | Any containerized application |
| **GitHub Action** | `Azure/functions-action@v1` | `azure/container-apps-deploy-action@v2` |
| **Build Process** | Zip and deploy | Build container → Push to registry → Deploy |
| **Runtime** | Managed by Azure Functions runtime | Custom via Dockerfile |
| **Scaling** | Automatic based on triggers | Configurable replica count and rules |
| **Authentication** | App Service credentials | OIDC or federated identity (preferred) |

---

## 🔧 Step-by-Step Migration

### Step 1: Create Azure Container App Resource

```bash
# Set variables
RESOURCE_GROUP="rg-greenchainz-prod"
CONTAINER_APP_NAME="greenchainz-scraper"
LOCATION="eastus"
CONTAINER_REGISTRY="acrgreenchainzprod916"
IMAGE_NAME="greenchainz-scraper"

# Create Container App Environment (if not exists)
az containerapp env create \
  --name greenchainz-env \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# Create Container App
az containerapp create \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment greenchainz-env \
  --image $CONTAINER_REGISTRY.azurecr.io/$IMAGE_NAME:latest \
  --target-port 3000 \
  --ingress external \
  --cpu 0.5 \
  --memory 1.0Gi \
  --min-replicas 1 \
  --max-replicas 3
```

### Step 2: Create Dockerfile

Create a `Dockerfile` (or `Dockerfile.scraper`) for your application:

```dockerfile
# Multi-stage build for Node.js application
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --production

# Runtime stage
FROM node:20-alpine AS runtime
WORKDIR /app

# Copy dependencies and application code
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "index.js"]
```

### Step 3: Update GitHub Actions Workflow

**Before (Function App):**

```yaml
name: Deploy to Azure Function App

on:
  push:
    branches: [main]

env:
  NODE_VERSION: '20.x'
  AZURE_FUNCTIONAPP_PACKAGE_PATH: '.'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
      
      - name: Install and build
        run: |
          npm install
          npm run build
      
      - name: Login to Azure
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZUREAPPSERVICE_CLIENTID }}
          tenant-id: ${{ secrets.AZUREAPPSERVICE_TENANTID }}
          subscription-id: ${{ secrets.AZUREAPPSERVICE_SUBSCRIPTIONID }}
      
      - name: Deploy to Function App
        uses: Azure/functions-action@v1
        with:
          app-name: 'greenchainz-scraper'
          package: ${{ env.AZURE_FUNCTIONAPP_PACKAGE_PATH }}
```

**After (Container App):**

```yaml
name: Deploy to Azure Container App

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  id-token: write
  contents: read

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Azure Login (Federated Identity - Zero Secrets)
        uses: azure/login@v2
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}
      
      - name: Get ACR login server
        id: acr
        run: |
          ACR_LOGIN_SERVER=$(az acr show \
            --name ${{ vars.CONTAINER_REGISTRY }} \
            --query loginServer -o tsv)
          echo "login_server=$ACR_LOGIN_SERVER" >> $GITHUB_OUTPUT
      
      - name: Build and Push Container Image
        run: |
          az acr build \
            --registry ${{ vars.CONTAINER_REGISTRY }} \
            --image greenchainz-scraper:${{ github.sha }} \
            --image greenchainz-scraper:latest \
            --file Dockerfile.scraper \
            .
      
      - name: Deploy Container App
        run: |
          az containerapp update \
            --name greenchainz-scraper \
            --resource-group ${{ vars.RESOURCE_GROUP }} \
            --image ${{ steps.acr.outputs.login_server }}/greenchainz-scraper:${{ github.sha }}
      
      - name: Deployment Summary
        run: |
          APP_URL=$(az containerapp show \
            --name greenchainz-scraper \
            --resource-group ${{ vars.RESOURCE_GROUP }} \
            --query properties.configuration.ingress.fqdn -o tsv)
          
          echo "### 🚀 Deployment Complete" >> $GITHUB_STEP_SUMMARY
          echo "**App URL:** https://$APP_URL" >> $GITHUB_STEP_SUMMARY
          echo "**Commit:** \`${{ github.sha }}\`" >> $GITHUB_STEP_SUMMARY
```

### Step 4: Configure GitHub Secrets/Variables

**Update Repository Settings:**

1. Go to: `Settings → Secrets and variables → Actions`

2. **Add Variables** (not secrets - these are safe to expose):
   - `AZURE_CLIENT_ID` - Azure AD Application ID
   - `AZURE_TENANT_ID` - Azure AD Tenant ID
   - `AZURE_SUBSCRIPTION_ID` - Azure Subscription ID
   - `CONTAINER_REGISTRY` - ACR name (e.g., `acrgreenchainzprod916`)
   - `RESOURCE_GROUP` - Resource group name

3. **Remove old secrets** (if no longer needed):
   - `AZUREAPPSERVICE_CLIENTID_*`
   - `AZUREAPPSERVICE_TENANTID_*`
   - `AZUREAPPSERVICE_SUBSCRIPTIONID_*`

### Step 5: Configure Federated Identity (Recommended)

**Why Federated Identity?**
- ✅ No secrets to manage or rotate
- ✅ More secure (short-lived tokens)
- ✅ Easier to maintain

**Setup Steps:**

```bash
# 1. Create Azure AD App Registration (if not exists)
APP_ID=$(az ad app create \
  --display-name "GitHub-Actions-GreenChainz" \
  --query appId -o tsv)

# 2. Create Service Principal
az ad sp create --id $APP_ID

# 3. Configure federated credential for GitHub
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "GitHub-Actions-Main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:jnorvi5/green-sourcing-b2b-app:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# 4. Grant Container App permissions
az role assignment create \
  --assignee $APP_ID \
  --role "Contributor" \
  --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP

# 5. Grant ACR permissions
az role assignment create \
  --assignee $APP_ID \
  --role "AcrPush" \
  --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.ContainerRegistry/registries/$CONTAINER_REGISTRY
```

### Step 6: Configure Environment Variables

**In Azure Container App:**

```bash
# Set environment variables for Container App
az containerapp update \
  --name greenchainz-scraper \
  --resource-group $RESOURCE_GROUP \
  --set-env-vars \
    NODE_ENV=production \
    DATABASE_URL=secretref:database-url \
    AZURE_STORAGE_CONNECTION_STRING=secretref:storage-connection
```

**For secrets, use Key Vault references:**

```bash
# Add Key Vault secret references
az containerapp update \
  --name greenchainz-scraper \
  --resource-group $RESOURCE_GROUP \
  --secrets \
    database-url=keyvaultref:https://GreenChainz-vault-2026.vault.azure.net/secrets/Database-URL,identityref:system
```

### Step 7: Test Deployment

**Manual trigger test:**

1. Go to GitHub Actions
2. Select the new workflow
3. Click "Run workflow"
4. Monitor execution

**Verify deployment:**

```bash
# Check Container App status
az containerapp show \
  --name greenchainz-scraper \
  --resource-group $RESOURCE_GROUP \
  --query properties.latestRevisionName -o tsv

# Check logs
az containerapp logs show \
  --name greenchainz-scraper \
  --resource-group $RESOURCE_GROUP \
  --follow

# Test endpoint
APP_URL=$(az containerapp show \
  --name greenchainz-scraper \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn -o tsv)

curl https://$APP_URL/health
```

---

## ✅ Validation Checklist

After migration, verify:

- [ ] Container App exists in Azure Portal
- [ ] GitHub workflow completes successfully
- [ ] Application is accessible via Container App URL
- [ ] Environment variables are correctly set
- [ ] Key Vault secrets are accessible (if used)
- [ ] Health check endpoint responds correctly
- [ ] Logs show application starting properly
- [ ] Old Function App workflow is disabled/removed
- [ ] Federated identity is working (no secret rotation needed)

---

## 🚨 Common Issues and Solutions

### Issue 1: Build fails with "No Dockerfile found"

**Cause:** Dockerfile path not specified or incorrect

**Solution:**
```yaml
az acr build \
  --registry $REGISTRY \
  --file Dockerfile.scraper \  # Specify correct Dockerfile path
  .
```

### Issue 2: Container App won't start

**Cause:** Missing required environment variables

**Solution:**
```bash
# Check logs for startup errors
az containerapp logs show --name greenchainz-scraper --resource-group $RG --follow

# Add missing environment variables
az containerapp update \
  --name greenchainz-scraper \
  --resource-group $RG \
  --set-env-vars REQUIRED_VAR=value
```

### Issue 3: Authentication fails

**Cause:** Federated credential not properly configured

**Solution:**
```bash
# Verify federated credential
az ad app federated-credential list --id $APP_ID

# Ensure subject matches: repo:OWNER/REPO:ref:refs/heads/BRANCH
# For pull requests: repo:OWNER/REPO:pull_request
```

### Issue 4: Container registry permission denied

**Cause:** Service principal lacks ACR push permissions

**Solution:**
```bash
# Grant ACR push permission
az role assignment create \
  --assignee $APP_ID \
  --role "AcrPush" \
  --scope /subscriptions/$SUB_ID/resourceGroups/$RG/providers/Microsoft.ContainerRegistry/registries/$ACR
```

---

## 📚 Additional Resources

**Azure Documentation:**
- [Azure Container Apps Overview](https://learn.microsoft.com/en-us/azure/container-apps/overview)
- [Deploy to Container Apps from GitHub Actions](https://learn.microsoft.com/en-us/azure/container-apps/github-actions)
- [Configure GitHub OIDC with Azure](https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure)

**Repository Documentation:**
- `AZURE_DEPLOYMENT_RESOURCES.md` - Complete architecture overview
- `AZURE_BUILD_ENFORCER_SUMMARY.md` - Node.js version requirements
- `.github/workflows/deploy-azure-cd.yml` - Reference implementation

---

## 🎯 Summary

**Key Takeaways:**

1. **Container Apps require a Dockerfile** - No zip file deployment
2. **Use federated identity** - More secure than long-lived secrets
3. **Build images in ACR** - Faster than pushing from GitHub runners
4. **Test thoroughly** - Verify logs, health checks, and environment variables
5. **Document changes** - Update repository documentation

**Benefits of Container Apps:**

- ✅ Full control over runtime environment
- ✅ Consistent local and cloud deployments
- ✅ Support for any containerized application
- ✅ Better scaling options
- ✅ More secure with federated identity

---

**Migration Status:** Use this guide to convert `main_greenchainz-scraper.yml` to Container App deployment  
**Next Steps:** Follow Step 1-7, then validate using the checklist  
**Support:** See `AZURE_DEPLOYMENT_RESOURCES.md` for architecture questions
