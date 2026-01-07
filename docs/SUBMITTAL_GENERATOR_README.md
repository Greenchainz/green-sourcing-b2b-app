# Submittal Auto-Generator Tool

**Azure-Native, Production-Ready Contractor Solution**

---

## Overview

The **Submittal Auto-Generator** is a powerful tool that helps general contractors (GCs) transform specification books into verified submittal packages in seconds.

### The Problem It Solves

> **Without the tool:** A GC wins a $2M construction bid. Now they spend **3+ weeks** manually finding data sheets, EPDs, and HPDs for 500+ materials to prove to the architect that their products meet the spec. Administrative nightmare. Hundreds of hours lost.

> **With the tool:** Contractor drags the architect's spec PDF. Gets a professional, verified submittal package **in 60 seconds**. Click "Download" and submit.

---

## How It Works

```
Contractor uploads Spec PDF
       ↓
Azure Document Intelligence (OCR)
Extracts text from PDF
       ↓
Azure OpenAI (LLM)
Analyzes spec: "Need Concrete with <300 kgCO2e, Type III EPD"
       ↓
Azure SQL Database (Product Catalog)
Matches: "3 verified suppliers meet the criteria"
       ↓
pdf-lib (PDF Generation)
Packages: Cover Sheet + Extracted Criteria + Products + EPDs
       ↓
Contractor downloads: "GreenChainz_Submittal.pdf"
```

---

## Technology Stack (100% Azure)

| Component | Azure Service | Purpose |
|-----------|---------------|---------|
| File Upload | Azure Blob Storage | Store spec PDFs temporarily |
| Text Extraction | Document Intelligence | Read PDF specs (OCR) |
| AI Analysis | Azure OpenAI | Extract requirements (LLM) |
| Product DB | Azure SQL Database | Store verified suppliers + products |
| PDF Generation | pdf-lib (npm) | Merge and create package |
| Hosting | Azure Container Apps | Run Next.js app |
| Deployment | Azure Container Registry | Store Docker images |
| CI/CD | GitHub Actions | Automated deployment |

---

## File Structure

```
app/
├── api/
│   ├── health/
│   │   └── route.ts                    # Health check for Azure
│   └── submittal/
│       └── generate/
│           └── route.ts                # Main API endpoint
└── tools/
    └── submittal-generator/
        └── page.tsx                    # Frontend UI

lib/
├── agents/
│   └── submittal-generator.ts          # Orchestration logic (5 functions)
└── azure/
    └── config.ts                       # Azure service clients

docs/
└── SUBMITTAL_AZURE_DEPLOYMENT.md       # Deployment guide

Dockerfile.azure                        # Container image
.env.azure.example                      # Environment variables
.github/workflows/deploy-azure.yml      # GitHub Actions CI/CD
```

---

## Core Functions

### 1. `uploadSpecToAzure(file: File)`
Uploads the PDF to Azure Blob Storage.

```typescript
const { fileUrl, fileBuffer } = await uploadSpecToAzure(specFile);
// Returns: URL in blob storage + buffer for next steps
```

### 2. `extractTextFromPDF(buffer: Buffer)`
Uses Azure Document Intelligence to read PDF text.

```typescript
const specText = await extractTextFromPDF(fileBuffer);
// Returns: "Section 03 30 00 - Concrete. Shall have GWP < 300..."
```

### 3. `extractRequirementsWithOpenAI(specText: string)`
Uses Azure OpenAI GPT-4o to parse requirements.

```typescript
const requirements = await extractRequirementsWithOpenAI(specText);
// Returns: { materialType: "Concrete", maxCarbon: 300, standards: ["ASTM C150"] }
```

### 4. `findVerifiedMatches(requirements: SpecRequirements)`
Queries Azure SQL for matching verified products.

```typescript
const matches = await findVerifiedMatches(requirements);
// Returns: Array of 3 products from verified suppliers
```

### 5. `buildPDFPackage(fileName, requirements, matches)`
Generates the final PDF using pdf-lib.

```typescript
const pdfBytes = await buildPDFPackage("spec.pdf", reqs, matches);
// Returns: Uint8Array ready for download
```

### 6. `generateSubmittalPackage(file: File)` ⭐
**Main Orchestrator** - Calls functions 1-5 in sequence.

```typescript
const result = await generateSubmittalPackage(file);
// Returns: { success, requirements, matches, pdfBytes, fileUrl }
```

---

## API Endpoint

### `POST /api/submittal/generate`

**Request:**
```bash
curl -X POST https://greenchainz.com/api/submittal/generate \
  -F "file=@specification.pdf"
```

**Response (Success):**
```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="GreenChainz_Submittal.pdf"

[PDF binary data]
```

**Response (Error):**
```json
HTTP/1.1 400 Bad Request
{
  "error": "Only PDF files are supported",
  "details": "Check server logs for details"
}
```

---

## Environment Variables Required

```bash
# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...

# Azure SQL Database
AZURE_SQL_SERVER=greenchainz.database.windows.net
AZURE_SQL_USER=greenchainzadmin
AZURE_SQL_PASSWORD=secure-password-here
AZURE_SQL_DATABASE=greenchainz_prod

# Azure Document Intelligence (OCR)
AZURE_DOC_INTEL_ENDPOINT=https://greenchainz-ai.cognitiveservices.azure.com/
AZURE_DOC_INTEL_KEY=your-api-key-here

# Azure OpenAI (LLM)
AZURE_OPENAI_ENDPOINT=https://greenchainz-openai.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
```

---

## Local Development

### 1. Set Up Environment
```bash
cp .env.azure.example .env.local
# Edit .env.local with your Azure credentials
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Dev Server
```bash
npm run dev
# Open http://localhost:3000/tools/submittal-generator
```

### 4. Test the API
```bash
# Create a test PDF or use existing
curl -F "file=@sample-spec.pdf" http://localhost:3000/api/submittal/generate \
  -o test-output.pdf
```

---

## Production Deployment

### GitHub Actions (Automated)
1. Push code to `main` branch
2. GitHub Actions automatically:
   - Builds Next.js app
   - Builds Docker image
   - Pushes to Azure Container Registry
   - Updates Azure Container App
   - Runs health checks

### Manual Deployment (Azure CLI)
```bash
# Build image
docker build -f Dockerfile.azure -t greenchainz:latest .

# Push to ACR
az acr login --name acrgreenchainzprod916
docker push acrgreenchainzprod916.azurecr.io/greenchainz:latest

# Update Container App
az containerapp update \
  --resource-group greenchainz-production \
  --name greenchainz-container \
  --image acrgreenchainzprod916.azurecr.io/greenchainz:latest
```

---

## Database Schema

```sql
-- Products table
CREATE TABLE Products (
    ProductID INT PRIMARY KEY IDENTITY,
    ProductName NVARCHAR(255) NOT NULL,
    SupplierID INT NOT NULL,
    CategoryID INT,
    FOREIGN KEY (SupplierID) REFERENCES Suppliers(SupplierID),
    FOREIGN KEY (CategoryID) REFERENCES Product_Categories(CategoryID)
);

-- Categories
CREATE TABLE Product_Categories (
    CategoryID INT PRIMARY KEY IDENTITY,
    CategoryName NVARCHAR(100) NOT NULL UNIQUE
);

-- EPDs and carbon data
CREATE TABLE Product_EPDs (
    EPDID INT PRIMARY KEY IDENTITY,
    ProductID INT NOT NULL,
    GlobalWarmingPotential DECIMAL(15,4),
    EPDDocumentURL NVARCHAR(2048),
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ProductID) REFERENCES Products(ProductID)
);

-- Suppliers (must be verified to appear in results)
CREATE TABLE Suppliers (
    SupplierID INT PRIMARY KEY IDENTITY,
    CompanyName NVARCHAR(255) NOT NULL,
    IsVerified BIT DEFAULT 0,
    VerificationDate DATETIME,
    FOREIGN KEY (VerificationDate) REFERENCES VerificationLog(DateVerified)
);

-- Create index for query performance
CREATE INDEX idx_products_category_gwp 
  ON Products(CategoryID) 
  WHERE CategoryID IS NOT NULL;

CREATE INDEX idx_epd_gwp 
  ON Product_EPDs(GlobalWarmingPotential);

CREATE INDEX idx_suppliers_verified 
  ON Suppliers(IsVerified);
```

---

## Monitoring & Logs

### View Container Logs
```bash
az containerapp logs show \
  --resource-group greenchainz-production \
  --name greenchainz-container \
  --follow
```

### Key Log Messages
```
✅ Uploaded spec.pdf to Azure Blob
✅ Extracted 15000 characters from PDF
✅ Extracted requirements: { materialType: "Concrete", ... }
✅ Found 3 verified matches
✅ Submittal package generated successfully
```

### Health Check
```bash
curl https://greenchainz.com/api/health
# Response: { "status": "healthy", "azure": { "sql": "connected", ... } }
```

---

## Performance Considerations

### Response Times (Typical)
- PDF Upload → Azure Blob: **~2s**
- OCR Extraction: **~5-8s** (depends on PDF size)
- AI Analysis: **~3-5s** (depends on spec complexity)
- DB Query: **~1s**
- PDF Generation: **~2-3s**
- **Total: ~15-20 seconds**

### Optimization Tips
1. **Blob Storage:** Use hot access tier for frequent uploads
2. **Document Intelligence:** Use async batch API for large PDFs
3. **Azure SQL:** Add indexes on `CategoryID`, `GlobalWarmingPotential`, `IsVerified`
4. **Container App:** Scale to 3+ replicas for production load

---

## Pricing Estimate (Monthly)

| Service | Usage | Cost |
|---------|-------|------|
| Azure Blob Storage | 1 GB uploads | $0.02 |
| Document Intelligence | 100 PDFs/month | $5-20 |
| Azure OpenAI | 100 calls/month | $10-30 |
| Azure SQL Database | Basic tier | $5-15 |
| Container Apps | 2 replicas, 0.5 CPU | $20-40 |
| **Total** | | **$40-105/mo** |

*Scales linearly with volume; enterprise discounts available*

---

## Troubleshooting

### Issue: "No file uploaded"
```
Solution: Ensure Content-Type is multipart/form-data
curl -F "file=@file.pdf" http://localhost:3000/api/submittal/generate
```

### Issue: "Document Intelligence error"
```
Solution: Verify endpoint and key in .env
az cognitiveservices account keys list \
  --resource-group greenchainz-production \
  --name greenchainz-ai
```

### Issue: "No verified matches found"
```
Solution: Check Azure SQL database has products with:
  - IsVerified = 1
  - GlobalWarmingPotential <= requirement
  - CategoryName matches material type
```

### Issue: Container won't start
```
Solution: Check logs for missing env vars
az containerapp logs show \
  --resource-group greenchainz-production \
  --name greenchainz-container
```

---

## Next Steps

1. **Test Locally:** `npm run dev` and upload a spec PDF
2. **Deploy:** Push to `main` and watch GitHub Actions
3. **Monitor:** Check logs and performance metrics
4. **Scale:** Increase Container App replicas if needed
5. **Monetize:** Tier pricing (free 1/mo, pro $499/mo for unlimited)

---

## Support

- 📖 Full guide: [SUBMITTAL_AZURE_DEPLOYMENT.md](./SUBMITTAL_AZURE_DEPLOYMENT.md)
- 🔧 Azure Docs: https://learn.microsoft.com/azure/container-apps
- 🤔 GitHub Issues: File a bug or feature request

---

**Last Updated:** January 7, 2026  
**Status:** Production Ready ✅  
**Architecture:** 100% Azure Native
