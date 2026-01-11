# Cosmos DB Seed Data for Persona Scraping Rules

This directory contains seed data for the Azure Cosmos DB `ScrapingRules` container.

## File Overview

- **cosmos-scraping-rules.json**: Contains the 7 procurement persona definitions with their scraping rules

## Importing Data to Cosmos DB

### Prerequisites

1. Azure Cosmos DB account created
2. Database named `greenchainz` (or your custom name)
3. Container named `ScrapingRules` with partition key `/personaId`
4. Azure CLI or Azure portal access

### Method 1: Using Azure Portal

1. Navigate to Azure Portal → Cosmos DB Account
2. Go to Data Explorer
3. Select your database (`greenchainz`)
4. Select your container (`ScrapingRules`)
5. Click "New Item"
6. Copy and paste each persona object from `cosmos-scraping-rules.json`
7. Click "Save"
8. Repeat for all 7 personas

### Method 2: Using Azure CLI

```bash
# Login to Azure
az login

# Set variables
RESOURCE_GROUP="greenchainzscraper"
ACCOUNT_NAME="greenchainz-cosmos"
DATABASE_NAME="greenchainz"
CONTAINER_NAME="ScrapingRules"

# Create database if it doesn't exist
az cosmosdb sql database create \
  --account-name $ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --name $DATABASE_NAME

# Create container if it doesn't exist
az cosmosdb sql container create \
  --account-name $ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --database-name $DATABASE_NAME \
  --name $CONTAINER_NAME \
  --partition-key-path "/personaId" \
  --throughput 400

# Import data using Azure Data Explorer or custom script
# Note: Azure CLI doesn't have a direct bulk import command
# Use Azure portal or a script with the Cosmos SDK
```

### Method 3: Using Node.js Script

Create an import script:

```javascript
const { CosmosClient } = require('@azure/cosmos');
const fs = require('fs');

const connectionString = process.env.COSMOS_CONNECTION_STRING;
const client = new CosmosClient(connectionString);

const database = client.database('greenchainz');
const container = database.container('ScrapingRules');

async function importData() {
  const data = JSON.parse(
    fs.readFileSync('./cosmos-scraping-rules.json', 'utf8')
  );
  
  for (const item of data) {
    try {
      await container.items.create(item);
      console.log(`Imported: ${item.personaId}`);
    } catch (error) {
      console.error(`Failed to import ${item.personaId}:`, error.message);
    }
  }
  
  console.log('Import complete');
}

importData();
```

Run with:
```bash
COSMOS_CONNECTION_STRING="your-connection-string" node import-script.js
```

### Method 4: Using PowerShell (Windows)

```powershell
# Install required module
Install-Module -Name Az.CosmosDB

# Connect to Azure
Connect-AzAccount

# Set variables
$resourceGroup = "greenchainzscraper"
$accountName = "greenchainz-cosmos"
$databaseName = "greenchainz"
$containerName = "ScrapingRules"

# Read and parse JSON
$personas = Get-Content -Path "cosmos-scraping-rules.json" | ConvertFrom-Json

# Import each persona (requires custom script or Azure portal)
# PowerShell doesn't have direct document creation commands
# Use the Azure portal or SDK-based script instead
```

## Container Configuration

### Recommended Settings

- **Partition Key**: `/personaId`
- **Throughput**: 400 RU/s (manual) or Autoscale 400-4000 RU/s
- **Indexing Policy**: Default (all properties indexed)
- **TTL**: Disabled (rules are static)

### Container Creation (Azure CLI)

```bash
az cosmosdb sql container create \
  --account-name greenchainz-cosmos \
  --resource-group greenchainzscraper \
  --database-name greenchainz \
  --name ScrapingRules \
  --partition-key-path "/personaId" \
  --throughput 400
```

## Document Structure

Each persona document follows this structure:

```json
{
  "id": "facility_manager",
  "personaId": "facility_manager",
  "jobTitle": "Facility Manager",
  "decisionLogic": ["TCO", "Maintenance", "Lifecycle", "Durability"],
  "scrapeKeywords": ["keyword1", "keyword2", ...],
  "ignoreKeywords": ["fluff1", "fluff2", ...],
  "outputSchema": {
    "field_name": {
      "type": "object",
      "description": "Field description",
      "required": true
    }
  },
  "createdAt": "2026-01-11T00:00:00Z",
  "updatedAt": "2026-01-11T00:00:00Z"
}
```

## The 7 Personas

1. **facility_manager** - Facility Manager (TCO, Maintenance, Lifecycle)
2. **project_manager_gc** - Project Manager GC (Installation, Logistics)
3. **quantity_surveyor** - Quantity Surveyor (ROI, NPV, Cost Analysis)
4. **flooring_sub** - Flooring Subcontractor (Moisture, Technical Specs)
5. **architect** - Architect (LEED Points, Aesthetics, Compliance)
6. **sustainability_consultant** - Sustainability Consultant (Documentation, Compliance)
7. **procurement_director** - Procurement Director (Risk, Liability, Stability)

## Updating Rules

To update scraping rules without redeploying the Azure Function:

1. Navigate to Azure Portal → Cosmos DB
2. Open Data Explorer
3. Find the persona document you want to update
4. Click "Edit"
5. Modify the `scrapeKeywords`, `ignoreKeywords`, or other fields
6. Update the `updatedAt` timestamp
7. Click "Update"

The ScrapingRulesService caches rules for 1 hour by default, so changes will take effect within that time window.

## Testing

After importing, verify the data:

```bash
# Using Azure CLI
az cosmosdb sql container query \
  --account-name greenchainz-cosmos \
  --resource-group greenchainzscraper \
  --database-name greenchainz \
  --name ScrapingRules \
  --query-text "SELECT * FROM c"
```

Or test via the persona-scraper function with a sample request.

## Troubleshooting

### Issue: "Container not found"
**Solution**: Create the container first with proper partition key (`/personaId`)

### Issue: "Partition key mismatch"
**Solution**: Ensure each document has `"personaId"` field matching the partition key path

### Issue: "Request rate too large"
**Solution**: Increase throughput (RU/s) or add delays between imports

### Issue: "Connection refused"
**Solution**: Check firewall rules and ensure your IP is allowed in Cosmos DB networking settings
