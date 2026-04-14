# Azure-Native Submittal Generator - Deployment Guide

**Status:** Production Ready  
**Date:** January 7, 2026  
**Architecture:** 100% Azure Native (No Vercel/Supabase/AWS)

---

## Quick Summary

The **Submittal Auto-Generator** tool is now 100% Azure-native:

- **Upload:** PDF → Azure Blob Storage
- **Parse:** Azure Document Intelligence (OCR)
- **Extract:** Azure OpenAI (AI/ML requirements)
- **Match:** Azure SQL Database (Product catalog)
- **Package:** pdf-lib (PDF generation)
- **Deploy:** Azure Container Apps + Azure Container Registry

---

## Prerequisites (Must Complete First)

### 1. Azure Resources Required

```bash
# Confirm these exist in your Azure account
- Resource Group: greenchainz-production
- Azure Container Registry: acrgreenchainzprod916
- Azure Container Apps: greenchainz-container
- Azure SQL Server: greenchainz.database.windows.net
- Azure Storage Account: greenchainzstorage
- Azure Document Intelligence: greenchainz-ai (East US)
- Azure OpenAI: greenchainz-openai (East US)
- Azure Key Vault: greenchainz-vault
```

### 2. GitHub Secrets Required

Set these in **Settings → Secrets and Variables → Actions**:

```
AZURE_CLIENT_ID              (Service Principal)
AZURE_TENANT_ID              (Your tenant ID)
AZURE_SUBSCRIPTION_ID        (Azure subscription)
AZURE_STORAGE_CONNECTION_STRING
AZURE_SQL_SERVER
AZURE_SQL_USER
AZURE_SQL_PASSWORD
AZURE_SQL_DATABASE
AZURE_DOC_INTEL_ENDPOINT
AZURE_DOC_INTEL_KEY
AZURE_OPENAI_ENDPOINT
AZURE_OPENAI_API_KEY
AZURE_OPENAI_DEPLOYMENT
```

---

## Local Development (Azure Emulation)

### 1. Install Azure CLI

```bash
# macOS
brew install azure-cli

# Windows
choco install azure-cli

# Linux
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

### 2. Set Up Local Environment

```bash
# Copy the Azure env template
cp .env.azure.example .env.local

# Edit with your Azure credentials
# Most important for local dev:
AZURE_STORAGE_CONNECTION_STRING=
AZURE_SQL_SERVER=
AZURE_SQL_USER=
AZURE_SQL_PASSWORD=
AZURE_SQL_DATABASE=
AZURE_DOC_INTEL_ENDPOINT=
AZURE_DOC_INTEL_KEY=
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_KEY=
```

### 3. Install Dependencies

```bash
npm install

# Verify Azure packages are installed
npm ls @azure/storage-blob @azure/ai-form-recognizer @azure/openai
```

### 4. Run Locally

```bash
npm run dev

# Test the submittal endpoint
curl -F "file=@sample-spec.pdf" http://localhost:3000/api/submittal/generate
```

---

## Deployment to Azure

### Option A: Automated (GitHub Actions)

**Trigger:** Push to `main` branch

```bash
# Push code
git add .
git commit -m "feat: submittal generator azure-native"
git push origin main

# Watch deployment in GitHub
# → Actions tab → deploy-azure.yml workflow
```

**What happens:**
1. Checkout code
2. Install dependencies
3. Build Next.js app
4. Build Docker image
5. Push to Azure Container Registry
6. Update Container App with new image
7. Health check validation

### Option B: Manual (Azure CLI)

```bash
# 1. Build Docker image
docker build -f Dockerfile.azure -t greenchainz:latest .

# 2. Tag for ACR
docker tag greenchainz:latest acrgreenchainzprod916.azurecr.io/greenchainz:latest

# 3. Login to ACR
az acr login --name acrgreenchainzprod916

# 4. Push image
docker push acrgreenchainzprod916.azurecr.io/greenchainz:latest

# 5. Update Container App
az containerapp update \
  --resource-group greenchainz-production \
  --name greenchainz-container \
  --image acrgreenchainzprod916.azurecr.io/greenchainz:latest

# 6. Monitor logs
az containerapp logs show \
  --resource-group greenchainz-production \
  --name greenchainz-container \
  --follow
```

---

## Production Validation

### 1. Verify Deployment

```bash
# Check container status
az containerapp show \
  --resource-group greenchainz-production \
  --name greenchainz-container \
  --query "properties.runningStatus"
# Expected: "Running"

# Check image deployed
az containerapp show \
  --resource-group greenchainz-production \
  --name greenchainz-container \
  --query "properties.template.containers[0].image"
```

### 2. Test Submittal Endpoint

```bash
# Create test PDF (or use existing)
# Then test the endpoint

curl -X POST https://greenchainz.com/api/submittal/generate \
  -F "file=@spec-document.pdf" \
  -o submittal-output.pdf

# Verify 200 response and PDF is generated
```

### 3. Monitor Logs

```bash
# Stream logs from Azure Container App
az containerapp logs show \
  --resource-group greenchainz-production \
  --name greenchainz-container \
  --follow

# Look for success messages like:
# ✅ Uploaded spec.pdf to Azure Blob
# ✅ Extracted 15000 characters from PDF
# ✅ Extracted requirements: { materialType: "Concrete", ... }
# ✅ Found 3 verified matches
# ✅ Submittal package generated successfully
```

### 4. Performance Monitoring

```bash
# View Azure Monitor metrics
az monitor metrics list \
  --resource /subscriptions/{subscription}/resourceGroups/greenchainz-production/providers/Microsoft.App/containerApps/greenchainz-container \
  --metric "Requests" "FailedRequests" "ResponseTime" \
  --interval PT1M \
  --start-time 2026-01-07T00:00:00Z
```

---

## Database Schema Required

Your Azure SQL database must have these tables:

```sql
CREATE TABLE Products (
    ProductID INT PRIMARY KEY IDENTITY,
    ProductName NVARCHAR(255) NOT NULL,
    SupplierID INT NOT NULL,
    CategoryID INT,
    FOREIGN KEY (SupplierID) REFERENCES Suppliers(SupplierID)
);

CREATE TABLE Product_Categories (
    CategoryID INT PRIMARY KEY IDENTITY,
    CategoryName NVARCHAR(100) NOT NULL
);

CREATE TABLE Product_EPDs (
    EPDID INT PRIMARY KEY IDENTITY,
    ProductID INT NOT NULL,
    GlobalWarmingPotential DECIMAL(15,4),
    EPDDocumentURL NVARCHAR(2048),
    FOREIGN KEY (ProductID) REFERENCES Products(ProductID)
);

CREATE TABLE Suppliers (
    SupplierID INT PRIMARY KEY IDENTITY,
    CompanyName NVARCHAR(255) NOT NULL,
    IsVerified BIT DEFAULT 0
);
```

---

## Troubleshooting

### Issue: "Missing AZURE_STORAGE_CONNECTION_STRING"

```bash
# Solution: Verify .env.local has the correct value
cat .env.local | grep AZURE_STORAGE_CONNECTION_STRING

# If missing, get it from Azure:
az storage account show-connection-string \
  --name greenchainzstorage \
  --resource-group greenchainz-production
```

### Issue: "Connection refused" (Azure SQL)

```bash
# Check firewall rules
az sql server firewall-rule list \
  --resource-group greenchainz-production \
  --server greenchainz

# Add your IP if needed
MY_IP=$(curl -s https://api.ipify.org)
az sql server firewall-rule create \
  --resource-group greenchainz-production \
  --server greenchainz \
  --name "dev-ip" \
  --start-ip-address $MY_IP \
  --end-ip-address $MY_IP
```

### Issue: "Document Intelligence error"

```bash
# Verify endpoint and key
az cognitiveservices account show \
  --resource-group greenchainz-production \
  --name greenchainz-ai \
  --query "endpoint"

# Verify key exists
az cognitiveservices account keys list \
  --resource-group greenchainz-production \
  --name greenchainz-ai
```

### Issue: Container won't start

```bash
# Check logs for errors
az containerapp logs show \
  --resource-group greenchainz-production \
  --name greenchainz-container \
  --follow

# Common causes:
# - Missing env vars → Check Azure Portal settings
# - Database connection → Check SQL firewall
# - Missing npm packages → Check Dockerfile node_modules
```

---

## File Structure Reference

```
app/
├── api/
│   └── submittal/
│       └── generate/
│           └── route.ts          ← API endpoint
└── tools/
    └── submittal-generator/
        └── page.tsx              ← Frontend UI

lib/
├── agents/
│   └── submittal-generator.ts    ← Azure orchestration
└── azure/
    └── config.ts                 ← Azure service clients

.github/workflows/
└── deploy-azure.yml              ← GitHub Actions pipeline

Dockerfile.azure                   ← Container image definition
.env.azure.example                 ← Environment variables template
```

---

## Next Steps

1. ✅ **Deploy this code** → Push to `main` and watch GitHub Actions
2. 📊 **Monitor performance** → Check Azure Monitor for metrics
3. 🔐 **Secure secrets** → Rotate keys regularly in Key Vault
4. 📈 **Scale if needed** → Increase Container App replicas
5. 🧪 **Load test** → Test with large PDFs before production launch

---

## Support & Questions

- **Azure Docs:** https://docs.microsoft.com/azure/container-apps
- **Next.js on Azure:** https://learn.microsoft.com/azure/app-service/quickstart-nodejs
- **GitHub Actions:** https://github.com/Azure/actions

**Last Updated:** January 7, 2026
