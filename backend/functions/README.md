# GreenChainz Azure Functions - Persona Scraper

This directory contains Azure Functions for the GreenChainz scraping infrastructure, including the new **Persona-Driven Scraping Architecture**.

## Overview

The scraping functions extract critical procurement data from supplier websites and product pages. Unlike generic "sustainability" scrapers, these functions target **role-specific decision logic** that procurement professionals actually care about:

- **Risk Mitigation**
- **Total Cost of Ownership (TCO)**
- **Return on Investment (ROI)**
- **Financial Liability**

## Functions

### 1. persona-scraper
**Type**: HTTP Trigger (POST)  
**Purpose**: Scrape websites based on persona-specific decision logic

Targets the 7 layers of procurement:
- Facility Manager
- Project Manager (GC)
- Quantity Surveyor
- Flooring Subcontractor
- Architect
- Sustainability Consultant
- Procurement Director

See [PERSONA_SCRAPER_ARCHITECTURE.md](../../docs/PERSONA_SCRAPER_ARCHITECTURE.md) for complete documentation.

### 2. gatekeeper-discovery (Phase 2 - Hunter Agents)
**Type**: HTTP Trigger (POST)  
**Purpose**: Find high-leverage procurement decision-makers using Bing Search API

Targets Financial Gatekeepers and Operational Stewards:
- Quantity Surveyors
- Infection Control Officers
- Insurance Risk Managers
- Facility Directors
- Procurement Directors

Includes GPT-4o qualification for lead scoring.

### 3. distributor-intelligence (Phase 2 - Hunter Agents)
**Type**: HTTP Trigger (POST)  
**Purpose**: Score distributors on compliance documentation and multi-functional SKUs

Analyzes Layer VII "Hidden Influencers":
- Ready-to-go documentation (LEED, EPDs)
- Multi-functional products that replace multiple trades
- Inventory transparency

See [HUNTER_AGENTS_ARCHITECTURE.md](../../docs/HUNTER_AGENTS_ARCHITECTURE.md) for complete documentation.

### 4. scrape-suppliers
**Type**: Timer Trigger (Daily 2 AM)  
**Purpose**: Scrape supplier websites for contact info and certifications

### 5. scrape-epd
**Type**: Timer Trigger (Weekly Sunday 2 AM)  
**Purpose**: Scrape EPD databases for material data

## Project Structure

```
backend/functions/
├── persona-scraper/          # NEW: Persona-driven scraper
│   ├── function.json
│   └── index.ts
├── scrape-suppliers/
│   ├── function.json
│   └── index.js
├── scrape-epd/
│   ├── function.json
│   └── index.js
├── shared/                   # NEW: Shared TypeScript modules
│   ├── constants/
│   │   └── personas.ts       # 7 procurement persona definitions
│   ├── services/
│   │   └── ScrapingRulesService.ts  # Cosmos DB integration
│   ├── types/
│   │   └── PersonaLogic.ts   # TypeScript interfaces
│   └── seed-data/
│       ├── cosmos-scraping-rules.json
│       └── README.md
├── dist/                     # Compiled TypeScript output (gitignored)
├── host.json
├── package.json
├── tsconfig.json             # NEW: TypeScript configuration
└── test-personas.js          # NEW: Test script
```

## Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript (persona-scraper), JavaScript (legacy functions)
- **Azure Functions**: v4
- **Database**: Azure Cosmos DB (for scraping rules)
- **Scraping**: Axios + Cheerio

## Setup

### Prerequisites

1. Node.js 18 or higher
2. Azure subscription
3. Azure Functions Core Tools (optional for local testing)

### Installation

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build
```

### Environment Variables

Required for persona-scraper:

```bash
# Azure Cosmos DB (for persona rules)
COSMOS_CONNECTION_STRING=AccountEndpoint=https://...;AccountKey=...
COSMOS_DATABASE_NAME=greenchainz
COSMOS_CONTAINER_NAME=ScrapingRules

# Database (for storing scraped data)
DATABASE_URL=postgres://user:password@host:5432/database

# Scraper configuration
SCRAPER_RATE_LIMIT_MS=2000
SCRAPER_MAX_BATCH=10
```

## Development

### Build TypeScript

```bash
npm run build
```

This compiles TypeScript files from `persona-scraper/` and `shared/` to JavaScript in the `dist/` directory.

### Watch Mode (Auto-recompile)

```bash
npm run watch
```

### Run Tests

```bash
# Test persona definitions and service
node test-personas.js
```

Expected output:
```
=== Testing Persona Scraper ===
✓ Found 7 personas defined
✓ Test 1 Passed: All personas loaded successfully
✓ Test 2 Passed: Persona lookup works
✓ Test 3 Passed: Service fallback works correctly
✓ Test 4 Passed: Data structure is valid
✓ Test 5 Passed: No critical keyword conflicts
=== All Tests Passed ===
```

### Local Testing (Azure Functions Core Tools)

```bash
# Start local Azure Functions runtime
npm start

# In another terminal, test the persona-scraper
curl -X POST http://localhost:7071/api/persona-scraper \
  -H "Content-Type: application/json" \
  -d '{
    "targetUrl": "https://example.com/product",
    "personaId": "facility_manager"
  }'
```

## Deployment

### Deploy to Azure

```bash
# Login to Azure
az login

# Deploy function app
func azure functionapp publish greenchainz-scraper
```

### Configure Cosmos DB

1. Create Cosmos DB account:
```bash
az cosmosdb create \
  --name greenchainz-cosmos \
  --resource-group greenchainzscraper
```

2. Create database and container:
```bash
az cosmosdb sql database create \
  --account-name greenchainz-cosmos \
  --resource-group greenchainzscraper \
  --name greenchainz

az cosmosdb sql container create \
  --account-name greenchainz-cosmos \
  --resource-group greenchainzscraper \
  --database-name greenchainz \
  --name ScrapingRules \
  --partition-key-path "/personaId" \
  --throughput 400
```

3. Import seed data:
   - See `shared/seed-data/README.md` for detailed instructions
   - Use Azure Portal Data Explorer to import JSON documents

4. Set connection string in Function App:
```bash
# Get connection string
CONNECTION_STRING=$(az cosmosdb keys list \
  --name greenchainz-cosmos \
  --resource-group greenchainzscraper \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" \
  --output tsv)

# Set in function app
az functionapp config appsettings set \
  --name greenchainz-scraper \
  --resource-group greenchainzscraper \
  --settings COSMOS_CONNECTION_STRING="$CONNECTION_STRING"
```

## API Usage

### Persona Scraper Endpoint

**POST** `/api/persona-scraper`

**Headers**:
```
Content-Type: application/json
x-functions-key: YOUR_FUNCTION_KEY
```

**Request Body**:
```json
{
  "targetUrl": "https://www.example.com/flooring-product",
  "personaId": "facility_manager",
  "customKeywords": ["optional", "additional", "keywords"]
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "personaId": "facility_manager",
  "jobTitle": "Facility Manager",
  "targetUrl": "https://www.example.com/flooring-product",
  "data": {
    "tco_data": {
      "keywords_found": ["total cost of ownership", "lifecycle cost"],
      "extracted_text": ["TCO over 20 years: $50,000"],
      "metrics": { "raw_values": ["20 years", "$50,000"] }
    },
    "maintenance_info": { /* ... */ },
    "warranty_details": { /* ... */ },
    "lifecycle_metrics": { /* ... */ }
  },
  "metadata": {
    "scrapedAt": "2026-01-11T21:00:00Z",
    "keywordsFound": ["total cost of ownership", "warranty"],
    "keywordsIgnored": ["eco-friendly"],
    "contentLength": 15420
  }
}
```

**Error Response** (400/404/500):
```json
{
  "success": false,
  "error": "Error message"
}
```

## Available Personas

| ID | Job Title | Focus |
|----|-----------|-------|
| `facility_manager` | Facility Manager | TCO, Maintenance, Lifecycle |
| `project_manager_gc` | Project Manager (GC) | Installation, Logistics |
| `quantity_surveyor` | Quantity Surveyor | ROI, NPV, Cost Analysis |
| `flooring_sub` | Flooring Subcontractor | Moisture, Technical Specs |
| `architect` | Architect | LEED, Aesthetics, Compliance |
| `sustainability_consultant` | Sustainability Consultant | Documentation, Verification |
| `procurement_director` | Procurement Director | Risk, Liability, Stability |

## Adding New Personas

### Option 1: Via Cosmos DB (No Deployment)

1. Open Azure Portal → Cosmos DB → Data Explorer
2. Navigate to `greenchainz` → `ScrapingRules`
3. Click "New Item"
4. Add persona JSON (see `shared/seed-data/cosmos-scraping-rules.json` for template)
5. Click "Save"

Changes take effect within 1 hour (cache expiry).

### Option 2: Via Code (Requires Deployment)

1. Edit `shared/constants/personas.ts`
2. Add new persona constant
3. Add to `PERSONAS` map
4. Rebuild: `npm run build`
5. Deploy: `func azure functionapp publish greenchainz-scraper`

## Troubleshooting

### Build Errors

**Issue**: TypeScript compilation errors

**Solution**:
```bash
# Check TypeScript version
npx tsc --version

# Clean and rebuild
rm -rf dist/
npm run build
```

### Module Not Found

**Issue**: `Cannot find module 'dist/...'`

**Solution**: Ensure TypeScript has been compiled:
```bash
npm run build
```

### Persona Not Found

**Issue**: API returns "Persona not found"

**Solution**:
1. Check spelling of personaId
2. Verify Cosmos DB has the document
3. Check COSMOS_CONNECTION_STRING is set
4. Wait for cache to expire (1 hour) or restart Function App

### Cosmos DB Connection Failed

**Issue**: "Cosmos client not initialized"

**Solution**:
1. Verify COSMOS_CONNECTION_STRING is set in Function App configuration
2. Check Cosmos DB firewall allows Azure services
3. Verify connection string format is correct

## Performance Notes

- **Caching**: Persona rules cached for 1 hour per Function App instance
- **Cosmos DB RU/s**: 400 RU/s sufficient for dev, 1000-4000 for production
- **Scraping Timeout**: 15 seconds per URL
- **Rate Limiting**: Consider implementing for external sites

## Security

- Use Function-level authentication (`authLevel: "function"`)
- Store connection strings in Azure Key Vault
- Respect robots.txt and website ToS
- Identify bot in User-Agent header
- Don't scrape PII or personal information

## Documentation

- **Architecture**: [docs/PERSONA_SCRAPER_ARCHITECTURE.md](../../docs/PERSONA_SCRAPER_ARCHITECTURE.md)
- **Seed Data**: [shared/seed-data/README.md](shared/seed-data/README.md)
- **Azure Setup**: [docs/OUTSIDE_ACTIONS_AZURE.md](../../docs/OUTSIDE_ACTIONS_AZURE.md)

## Support

For questions or issues:
- Check documentation in `/docs`
- Review function logs in Azure Portal
- Test locally with `node test-personas.js`

---

**Last Updated**: 2026-01-11  
**Version**: 1.0.0
