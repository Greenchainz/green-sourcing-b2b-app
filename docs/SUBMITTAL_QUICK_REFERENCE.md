# Submittal Generator - Developer Quick Reference

## 🎯 What is This?

The **Submittal Auto-Generator** is the GreenChainz tool for contractors (General Contractors/GCs). It solves a real pain point:

**Before:** Manually searching for 500+ material specs = 3+ weeks  
**After:** Drag PDF, get verified submittal package = 60 seconds

---

## 📁 File Locations (Copy/Paste Ready)

```
Frontend UI:
app/tools/submittal-generator/page.tsx

API Endpoint:
app/api/submittal/generate/route.ts

Health Check:
app/api/health/route.ts

Core Logic:
lib/agents/submittal-generator.ts

Azure Config:
lib/azure/config.ts

Deployment:
Dockerfile.azure
.github/workflows/deploy-azure.yml
.env.azure.example

Docs:
docs/SUBMITTAL_AZURE_DEPLOYMENT.md
docs/SUBMITTAL_GENERATOR_README.md
docs/SUBMITTAL_LAUNCH_CHECKLIST.md
```

---

## 🔧 Core Functions (What Happens)

### `generateSubmittalPackage(file: File)` - THE MAIN ONE

```typescript
// What it does:
1. uploadSpecToAzure(file)              // → Upload PDF to blob storage
2. extractTextFromPDF(buffer)           // → Azure Document Intelligence reads it
3. extractRequirementsWithOpenAI(text)  // → Azure OpenAI parses requirements
4. findVerifiedMatches(requirements)    // → Azure SQL queries for products
5. buildPDFPackage(name, reqs, matches) // → pdf-lib generates PDF
// Returns: { success, requirements, matches, pdfBytes, fileUrl }
```

### Individual Functions

```typescript
uploadSpecToAzure(file)
// Upload PDF to Azure Blob Storage
// Returns: { fileUrl, fileBuffer }

extractTextFromPDF(buffer)
// Uses Azure Document Intelligence to OCR the PDF
// Returns: text string (max 80KB)

extractRequirementsWithOpenAI(text)
// Uses Azure OpenAI to parse spec text
// Returns: { materialType, maxCarbon, standards, requiredCerts, ... }

findVerifiedMatches(requirements)
// Queries Azure SQL for products matching criteria
// Returns: Array of 3 Product objects

buildPDFPackage(fileName, requirements, matches)
// Uses pdf-lib to generate professional PDF
// Returns: Uint8Array (binary PDF data)
```

---

## 🌐 API Endpoint

### URL
```
POST https://greenchainz.com/api/submittal/generate
(local: POST http://localhost:3000/api/submittal/generate)
```

### Request
```bash
curl -F "file=@spec.pdf" https://greenchainz.com/api/submittal/generate -o output.pdf
```

### Response
- **Success:** 200 with PDF binary data
- **Error:** 400-500 with JSON error

---

## 🏗️ Azure Architecture

```
┌─────────────────────────────────────────────────────┐
│                  CONTRACTOR (Browser)               │
│         Open greenchainz.com/tools/submittal        │
└────────────────────┬────────────────────────────────┘
                     │ Upload PDF
                     ▼
        ┌────────────────────────────────┐
        │   Azure Container Apps         │
        │  (Next.js running on Linux)    │
        └─┬─────────────────────────────┬┘
          │                             │
    ┌─────▼──────┐          ┌──────────▼─────┐
    │   STEP 1   │          │    STEP 2      │
    │   Upload   │          │    Extract     │
    │   to Blob  │          │    Text (OCR)  │
    │ Storage    │          │  Document Int. │
    └─────┬──────┘          └──────────┬─────┘
          │                             │
    ┌─────▼────────────────────────────▼──┐
    │       STEP 3: Analyze with AI        │
    │  Azure OpenAI (GPT-4o)               │
    │  Output: { materialType, maxCarbon } │
    └──┬──────────────────────────────────┘
       │
    ┌──▼──────────────────────┐
    │  STEP 4: Query Database │
    │  Azure SQL              │
    │  Find 3 verified        │
    │  products matching      │
    │  requirements           │
    └──┬───────────────────────┘
       │
    ┌──▼────────────────────────┐
    │ STEP 5: Generate PDF      │
    │ pdf-lib                   │
    │ Cover + Criteria + Prod + │
    │ EPDs = final package      │
    └──┬───────────────────────┘
       │
       └─────────────────────────►  PDF Download
```

---

## 🚀 Local Development

### Setup
```bash
# 1. Copy env file
cp .env.azure.example .env.local

# 2. Edit with Azure credentials
nano .env.local

# 3. Install deps
npm install

# 4. Run dev
npm run dev

# 5. Open browser
open http://localhost:3000/tools/submittal-generator
```

### Test API Directly
```bash
# Upload test PDF
curl -F "file=@sample.pdf" \
  http://localhost:3000/api/submittal/generate \
  -o output.pdf

# Check health
curl http://localhost:3000/api/health
```

### Debug
```bash
# View error logs
tail -f ~/.npm/_logs/debug-*.log

# Check env vars loaded
node -e "console.log(process.env.AZURE_SQL_SERVER)"

# Test Azure connection
npx ts-node lib/azure/config.ts
```

---

## 📦 Dependencies Needed

```json
{
  "@azure/storage-blob": "^12.0.0",
  "@azure/ai-form-recognizer": "^5.0.0",
  "@azure/openai": "^1.0.0",
  "mssql": "^11.0.0",
  "pdf-lib": "^1.17.1",
  "next": "^15.0.0",
  "react": "^19.0.0"
}
```

Install if missing:
```bash
npm install @azure/storage-blob @azure/ai-form-recognizer @azure/openai mssql pdf-lib
```

---

## 🐳 Docker & Deployment

### Local Docker Test
```bash
# Build image (same as GitHub Actions)
docker build -f Dockerfile.azure -t greenchainz:test .

# Run container
docker run -e AZURE_STORAGE_CONNECTION_STRING="..." \
  -e AZURE_SQL_SERVER="..." \
  -p 3000:3000 \
  greenchainz:test

# Test in container
curl http://localhost:3000/api/health
```

### Deploy to Azure
```bash
# Method 1: GitHub Actions (automatic)
git push origin main
# Wait for .github/workflows/deploy-azure.yml to finish

# Method 2: Manual
docker build -f Dockerfile.azure -t greenchainz:latest .
docker tag greenchainz:latest acrgreenchainzprod916.azurecr.io/greenchainz:latest
az acr login --name acrgreenchainzprod916
docker push acrgreenchainzprod916.azurecr.io/greenchainz:latest
az containerapp update \
  --resource-group greenchainz-production \
  --name greenchainz-container \
  --image acrgreenchainzprod916.azurecr.io/greenchainz:latest
```

---

## 🔍 Debugging Checklist

| Problem | Check | Fix |
|---------|-------|-----|
| "No file uploaded" | Content-Type header | Use `-F` with curl |
| "Document Intelligence error" | Endpoint + Key | Check Azure Portal |
| "Database connection failed" | SQL firewall | Add your IP to allow-list |
| "OpenAI error" | API key + deployment | Verify Key Vault secret |
| "PDF won't download" | Response headers | Check route.ts returns binary |
| Container won't start | Docker build | Check `npm install` in Dockerfile |
| Health check fails | ENV vars | Verify all AZURE_* vars set |

---

## 📊 Performance Targets

| Operation | Target Time | Actual |
|-----------|------------|--------|
| Upload to Blob | < 2s | ~1-2s |
| OCR (Document Intelligence) | < 10s | ~5-8s |
| LLM Analysis (OpenAI) | < 5s | ~3-5s |
| Database Query | < 1s | ~0.5s |
| PDF Generation | < 3s | ~2-3s |
| **TOTAL** | **< 20s** | **~15-20s** ✅ |

---

## 🚨 Critical Paths

### If Something Breaks in Production

```bash
# 1. Check Container App Status
az containerapp show \
  --resource-group greenchainz-production \
  --name greenchainz-container \
  --query "properties.runningStatus"

# 2. Stream Logs (find the error)
az containerapp logs show \
  --resource-group greenchainz-production \
  --name greenchainz-container \
  --follow

# 3. Rollback (if critical)
az containerapp update \
  --resource-group greenchainz-production \
  --name greenchainz-container \
  --image acrgreenchainzprod916.azurecr.io/greenchainz:previous

# 4. Fix Code Locally
git fix your-bug
git push origin main
# GitHub Actions will auto-redeploy
```

---

## 📚 Documentation

| Document | Purpose | Link |
|----------|---------|------|
| Deployment Guide | How to deploy to Azure | `docs/SUBMITTAL_AZURE_DEPLOYMENT.md` |
| Feature README | What the tool does & how | `docs/SUBMITTAL_GENERATOR_README.md` |
| Launch Checklist | Pre-launch verification | `docs/SUBMITTAL_LAUNCH_CHECKLIST.md` |
| This File | Dev quick ref | `docs/SUBMITTAL_QUICK_REFERENCE.md` |

---

## 🎓 Key Concepts

**Azure Blob Storage:** Like AWS S3 for PDFs  
**Document Intelligence:** OCR (reads PDF text)  
**Azure OpenAI:** LLM (understands requirements)  
**Azure SQL:** Database (stores products)  
**Container Apps:** Serverless Docker runner (hosts app)  
**pdf-lib:** JavaScript library to generate PDFs  

---

## 🔗 Useful Commands

```bash
# View all environment variables
env | grep AZURE

# Test Azure SQL connection
sqlcmd -S greenchainz.database.windows.net \
  -U greenchainzadmin \
  -P 'YOUR_PASSWORD' \
  -d greenchainz_prod \
  -Q "SELECT 1"

# View Azure Container App metrics
az monitor metrics list \
  --resource /subscriptions/SUB_ID/resourceGroups/greenchainz-production/providers/Microsoft.App/containerApps/greenchainz-container

# List images in ACR
az acr repository list --name acrgreenchainzprod916

# Show image tags
az acr repository show-tags --name acrgreenchainzprod916 --repository greenchainz
```

---

**Last Updated:** January 7, 2026  
**Quick Links:** [Deployment](./SUBMITTAL_AZURE_DEPLOYMENT.md) | [README](./SUBMITTAL_GENERATOR_README.md) | [Checklist](./SUBMITTAL_LAUNCH_CHECKLIST.md)
