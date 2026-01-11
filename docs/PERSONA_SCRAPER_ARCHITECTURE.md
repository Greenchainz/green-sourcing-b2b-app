# Persona-Driven Scraping Architecture

## Overview

The Persona-Driven Scraping Architecture is a revolutionary approach to procurement intelligence that **abandons generic "sustainability" keywords** in favor of **role-specific decision logic**. This system recognizes that procurement is NOT about "saving the planet"—it's about **Risk Mitigation, TCO, ROI, and Liability**.

### Key Insight

**Generic sustainability scraping is useless.** Procurement decisions are driven by:
- **Risk Mitigation** - What could go wrong?
- **Asset Strategy** - What's the total cost of ownership?
- **Financial Liability** - What's our ROI and risk exposure?

Americans don't care about "save the world" marketing. They care about the **bottom line**.

## Architecture Components

### 1. PersonaLogic Interface
**Location**: `backend/functions/shared/types/PersonaLogic.ts`

Defines the structure for persona-specific scraping rules:

```typescript
interface PersonaLogic {
  personaId: string;              // Unique identifier
  jobTitle: string;               // Human-readable title
  decisionLogic: string[];        // Decision factors (TCO, ROI, etc.)
  scrapeKeywords: string[];       // Specific terms to hunt for
  ignoreKeywords: string[];       // Marketing fluff to skip
  outputSchema: OutputSchema;     // Expected output structure
  createdAt?: string;
  updatedAt?: string;
}
```

### 2. ScrapingRulesService
**Location**: `backend/functions/shared/services/ScrapingRulesService.ts`

Service that manages persona rules with:
- **Azure Cosmos DB Integration** - Fetches rules from cloud database
- **Caching** - 1-hour cache to reduce Cosmos DB calls
- **Fallback Logic** - Uses default rules if Cosmos DB unavailable
- **Singleton Pattern** - Single instance shared across functions

```typescript
const service = getScrapingRulesService();
const persona = await service.getPersonaRules('facility_manager');
```

### 3. Persona-Scraper Azure Function
**Location**: `backend/functions/persona-scraper/`

HTTP-triggered function that:
1. Receives POST request with `targetUrl`, `personaId`, and optional `customKeywords`
2. Fetches persona rules from ScrapingRulesService
3. Scrapes the target URL using Axios and Cheerio
4. Filters content based on `scrapeKeywords` (include) and `ignoreKeywords` (exclude)
5. Extracts structured data matching the persona's `decisionLogic`
6. Returns JSON formatted per persona's `outputSchema`

**Endpoint**: `POST /api/persona-scraper`

### 4. The 7 Procurement Personas
**Location**: `backend/functions/shared/constants/personas.ts`

| Persona ID | Job Title | Focus Areas |
|-----------|-----------|-------------|
| `facility_manager` | Facility Manager | TCO, Maintenance, Lifecycle, Durability |
| `project_manager_gc` | Project Manager (GC) | Installation Speed, Logistics, Schedule |
| `quantity_surveyor` | Quantity Surveyor | ROI, NPV, Cost Analysis, Financial Metrics |
| `flooring_sub` | Flooring Subcontractor | Moisture Mitigation, Technical Specs |
| `architect` | Architect | LEED Points, Aesthetics, Compliance |
| `sustainability_consultant` | Sustainability Consultant | Documentation, Compliance, Verification |
| `procurement_director` | Procurement Director | Risk, Liability, Financial Stability |

## API Usage

### Request Format

```bash
POST https://greenchainz-scraper.azurewebsites.net/api/persona-scraper
Content-Type: application/json
x-functions-key: YOUR_FUNCTION_KEY

{
  "targetUrl": "https://www.example.com/product-page",
  "personaId": "facility_manager",
  "customKeywords": ["custom term 1", "custom term 2"]  // Optional
}
```

### Response Format

```json
{
  "success": true,
  "personaId": "facility_manager",
  "jobTitle": "Facility Manager",
  "targetUrl": "https://www.example.com/product-page",
  "data": {
    "tco_data": {
      "keywords_found": ["total cost of ownership", "lifecycle cost"],
      "extracted_text": [
        "Total cost of ownership over 20 years is $50,000",
        "Lifecycle cost analysis shows 30% savings"
      ],
      "metrics": {
        "raw_values": ["20 years", "$50,000", "30%"]
      }
    },
    "maintenance_info": {
      "keywords_found": ["maintenance schedule", "warranty"],
      "extracted_text": [
        "Annual maintenance required: $500/year",
        "10-year warranty included"
      ],
      "metrics": {
        "raw_values": ["$500/year", "10 years"]
      }
    },
    "warranty_details": { /* ... */ },
    "lifecycle_metrics": { /* ... */ }
  },
  "metadata": {
    "scrapedAt": "2026-01-11T21:00:00Z",
    "keywordsFound": ["total cost of ownership", "maintenance schedule"],
    "keywordsIgnored": ["eco-friendly", "save the planet"],
    "contentLength": 15420
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Persona not found: invalid_persona_id"
}
```

## Adding New Personas

### Method 1: Add to Cosmos DB (Recommended)

1. Navigate to Azure Portal → Cosmos DB
2. Open Data Explorer → `greenchainz` database → `ScrapingRules` container
3. Click "New Item"
4. Add your persona document:

```json
{
  "id": "safety_manager",
  "personaId": "safety_manager",
  "jobTitle": "Safety Manager",
  "decisionLogic": ["OSHA Compliance", "Safety Ratings", "Incident Reports"],
  "scrapeKeywords": [
    "osha compliant",
    "safety rating",
    "incident free",
    "safety data sheet",
    "sds"
  ],
  "ignoreKeywords": [
    "green choice",
    "eco-friendly"
  ],
  "outputSchema": {
    "safety_compliance": {
      "type": "object",
      "description": "OSHA and safety compliance data",
      "required": true
    },
    "safety_metrics": {
      "type": "object",
      "description": "Safety ratings and incident data",
      "required": true
    }
  },
  "createdAt": "2026-01-11T21:00:00Z",
  "updatedAt": "2026-01-11T21:00:00Z"
}
```

5. Click "Save"

**No redeployment needed!** The ScrapingRulesService will fetch the new persona automatically (cache expires after 1 hour).

### Method 2: Add to Code (Default Personas)

1. Edit `backend/functions/shared/constants/personas.ts`
2. Add your persona constant:

```typescript
export const SAFETY_MANAGER: PersonaLogic = {
  personaId: 'safety_manager',
  jobTitle: 'Safety Manager',
  // ... rest of definition
};
```

3. Add to PERSONAS map:

```typescript
export const PERSONAS: Record<string, PersonaLogic> = {
  // ... existing personas
  safety_manager: SAFETY_MANAGER
};
```

4. Rebuild and redeploy:

```bash
cd backend/functions
npm run build
func azure functionapp publish greenchainz-scraper
```

## Updating Scraping Rules

### Update via Cosmos DB (No Deployment)

1. Azure Portal → Cosmos DB → Data Explorer
2. Find the persona document (e.g., `facility_manager`)
3. Click "Edit"
4. Modify fields:
   - Add/remove keywords from `scrapeKeywords`
   - Add/remove keywords from `ignoreKeywords`
   - Update `decisionLogic`
   - Modify `outputSchema`
5. Update the `updatedAt` timestamp
6. Click "Update"

**Changes take effect within 1 hour** (cache expiry time).

To force immediate update, you can:
- Restart the Azure Function App
- Wait for cache to expire naturally
- Use the cache invalidation endpoint (if implemented)

### Update via Code (Requires Deployment)

1. Edit `backend/functions/shared/constants/personas.ts`
2. Modify the persona definition
3. Rebuild and redeploy

## Cosmos DB Setup

### Prerequisites

1. Azure subscription
2. Resource group (e.g., `greenchainzscraper`)
3. Azure CLI or Azure portal access

### Create Cosmos DB Account

```bash
# Variables
RESOURCE_GROUP="greenchainzscraper"
ACCOUNT_NAME="greenchainz-cosmos"
LOCATION="eastus"

# Create Cosmos DB account
az cosmosdb create \
  --name $ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --locations regionName=$LOCATION \
  --default-consistency-level Session \
  --enable-automatic-failover false
```

### Create Database and Container

```bash
# Create database
az cosmosdb sql database create \
  --account-name $ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --name greenchainz

# Create container with partition key
az cosmosdb sql container create \
  --account-name $ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --database-name greenchainz \
  --name ScrapingRules \
  --partition-key-path "/personaId" \
  --throughput 400
```

### Get Connection String

```bash
az cosmosdb keys list \
  --name $ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" \
  --output tsv
```

### Configure Azure Function

1. Navigate to Azure Portal → Function App → Configuration
2. Add new application setting:
   - **Name**: `COSMOS_CONNECTION_STRING`
   - **Value**: Your Cosmos DB connection string
3. Add optional settings:
   - **Name**: `COSMOS_DATABASE_NAME`, **Value**: `greenchainz` (default)
   - **Name**: `COSMOS_CONTAINER_NAME`, **Value**: `ScrapingRules` (default)
4. Click "Save"

### Import Seed Data

See `backend/functions/shared/seed-data/README.md` for detailed import instructions.

**Quick method via Azure Portal**:
1. Data Explorer → `greenchainz` → `ScrapingRules`
2. Click "New Item"
3. Paste persona JSON from `cosmos-scraping-rules.json`
4. Click "Save"
5. Repeat for all 7 personas

## Integration with Azure Logic App

The persona-scraper can be integrated with Azure Logic Apps for automated workflows:

### Example: Scheduled Supplier Scraping

1. **Trigger**: Recurrence (daily at 2 AM)
2. **Action 1**: Query database for suppliers with websites
3. **Action 2**: For each supplier, call persona-scraper
   - URL: Supplier website
   - PersonaId: Based on supplier category
4. **Action 3**: Store results in database
5. **Action 4**: Send notification if critical data found

### Example: On-Demand Product Analysis

1. **Trigger**: HTTP request (from frontend)
2. **Action 1**: Parse request (product URL, persona type)
3. **Action 2**: Call persona-scraper function
4. **Action 3**: Transform response
5. **Action 4**: Return to frontend

### Example: Multi-Persona Analysis

1. **Trigger**: HTTP request with product URL
2. **Action 1**: For each of the 7 personas:
   - Call persona-scraper with different personaId
3. **Action 2**: Aggregate all responses
4. **Action 3**: Generate comprehensive report
5. **Action 4**: Store in database and notify user

## Testing the API

### Using cURL

```bash
# Test with Facility Manager persona
curl -X POST https://greenchainz-scraper.azurewebsites.net/api/persona-scraper \
  -H "Content-Type: application/json" \
  -H "x-functions-key: YOUR_FUNCTION_KEY" \
  -d '{
    "targetUrl": "https://www.example.com/flooring-product",
    "personaId": "facility_manager"
  }'
```

### Using Postman

1. Create new POST request
2. URL: `https://greenchainz-scraper.azurewebsites.net/api/persona-scraper`
3. Headers:
   - `Content-Type`: `application/json`
   - `x-functions-key`: `YOUR_FUNCTION_KEY`
4. Body (raw JSON):
```json
{
  "targetUrl": "https://www.example.com/flooring-product",
  "personaId": "quantity_surveyor",
  "customKeywords": ["pricing", "bulk discount"]
}
```
5. Send request

### Using Azure Functions Core Tools (Local Testing)

```bash
cd backend/functions
npm install
npm run build
func start

# In another terminal
curl -X POST http://localhost:7071/api/persona-scraper \
  -H "Content-Type: application/json" \
  -d '{
    "targetUrl": "https://www.example.com/product",
    "personaId": "flooring_sub"
  }'
```

## Environment Variables

### Required

- `COSMOS_CONNECTION_STRING`: Azure Cosmos DB connection string (from Key Vault)

### Optional

- `COSMOS_DATABASE_NAME`: Database name (default: `greenchainz`)
- `COSMOS_CONTAINER_NAME`: Container name (default: `ScrapingRules`)

### Setting in Azure

**Via Azure Portal**:
1. Function App → Configuration → Application settings
2. Click "New application setting"
3. Add key-value pairs
4. Click "Save"

**Via Azure CLI**:
```bash
az functionapp config appsettings set \
  --name greenchainz-scraper \
  --resource-group greenchainzscraper \
  --settings COSMOS_CONNECTION_STRING="your-connection-string"
```

## Performance Considerations

### Caching
- Persona rules cached for 1 hour
- Reduces Cosmos DB RU consumption
- Cache per Function App instance (not shared)

### Cosmos DB Throughput
- **Development**: 400 RU/s manual
- **Production**: 1000-4000 RU/s autoscale recommended
- 7 personas = 7 documents (minimal storage)
- Read-heavy workload (cache reduces reads)

### Scraping Rate Limits
- Default timeout: 15 seconds per URL
- Consider implementing rate limiting for external sites
- Use queue-based processing for bulk operations

### Cost Optimization
- Use serverless/consumption plan for Functions
- Use autoscale for Cosmos DB
- Cache reduces Cosmos DB costs significantly
- Consider Azure CDN for frequently accessed data

## Troubleshooting

### Issue: "Persona not found"
**Cause**: Persona doesn't exist in Cosmos DB or default personas  
**Solution**: Check personaId spelling, verify Cosmos DB has the document

### Issue: "Failed to fetch URL"
**Cause**: Target website blocks scrapers, network timeout, invalid URL  
**Solution**: 
- Check if website allows scraping (robots.txt)
- Verify URL is accessible
- Consider adding retry logic or using proxies

### Issue: "Cosmos client not initialized"
**Cause**: Missing `COSMOS_CONNECTION_STRING` environment variable  
**Solution**: Set the connection string in Function App settings

### Issue: "Cache not updating"
**Cause**: Cache expiry not reached (1 hour)  
**Solution**: Wait for cache expiry or restart Function App

### Issue: "No keywords found"
**Cause**: Website doesn't contain relevant keywords for this persona  
**Solution**: 
- Verify keywords are appropriate for the website type
- Add custom keywords in request
- Try different persona that matches website content

## Best Practices

### 1. Keyword Selection
- **Do**: Use specific, measurable terms ("warranty years", "cost per unit")
- **Don't**: Use vague marketing terms ("eco-friendly", "sustainable")

### 2. Persona Design
- Focus on **decision factors**, not generic attributes
- Keywords should reflect **what this role searches for in documents**
- Ignore keywords should filter **marketing fluff**, not useful content

### 3. Output Schema Design
- Structure should match **how this persona thinks**
- Group related data logically
- Mark critical fields as `required: true`

### 4. Testing
- Test with **real supplier websites**, not Lorem Ipsum
- Verify each persona finds **different information** on same page
- Check that ignore keywords actually filter out fluff

### 5. Maintenance
- Review and update keywords quarterly
- Monitor which keywords actually yield results
- Remove keywords that never match
- Add new industry terms as they emerge

## Migration from Old Scraping

### Old System (Generic)
```javascript
// Old: Generic sustainability keywords
const keywords = ['LEED', 'EPD', 'eco-friendly', 'sustainable'];
```

### New System (Persona-Driven)
```javascript
// New: Role-specific decision logic
const facilityManager = {
  scrapeKeywords: ['total cost of ownership', 'maintenance schedule', 'warranty years'],
  ignoreKeywords: ['eco-friendly', 'sustainable future']
};
```

### Migration Steps

1. **Inventory Current Scrapers**: List all existing scraping functions
2. **Map to Personas**: Determine which persona each scraper serves
3. **Deploy New System**: Deploy persona-scraper function
4. **Update Callers**: Migrate API calls to use persona-scraper
5. **Run in Parallel**: Keep old system running during transition
6. **Validate Results**: Compare old vs new scraping results
7. **Deprecate Old System**: Once validated, remove old scrapers

## Security Considerations

### API Key Management
- Use Azure Function authentication (`authLevel: "function"`)
- Store function keys in Key Vault
- Rotate keys regularly

### Data Privacy
- Don't scrape personal information (PII)
- Respect robots.txt
- Identify bot in User-Agent header

### Rate Limiting
- Implement per-IP rate limiting
- Use exponential backoff for retries
- Consider queue-based processing for bulk operations

## Roadmap

### Phase 1: Core Implementation ✅
- [x] PersonaLogic interface
- [x] ScrapingRulesService with Cosmos DB
- [x] 7 Procurement Personas defined
- [x] Persona-scraper function
- [x] Documentation

### Phase 2: Enhancements (Q1 2026)
- [ ] Advanced NLP for better data extraction
- [ ] Confidence scores for extracted data
- [ ] Multi-page scraping support
- [ ] Screenshot capture for visual analysis
- [ ] Integration with Azure AI for entity extraction

### Phase 3: Intelligence Layer (Q2 2026)
- [ ] Machine learning for keyword optimization
- [ ] Automatic persona recommendation based on URL
- [ ] Anomaly detection (e.g., sudden price changes)
- [ ] Competitive intelligence tracking

### Phase 4: Scale (Q3 2026)
- [ ] Distributed scraping with Azure Durable Functions
- [ ] Real-time scraping via Azure Event Grid
- [ ] Data lake integration for historical analysis
- [ ] Power BI dashboards for procurement insights

## Support

For questions or issues:
- **Documentation**: See this file and related docs in `/docs`
- **Code Issues**: Check TypeScript types and function logs
- **Cosmos DB**: See seed-data README for import instructions
- **Azure Functions**: Review Function App logs in Azure Portal

---

**Last Updated**: 2026-01-11  
**Version**: 1.0.0  
**Author**: GreenChainz Engineering Team
