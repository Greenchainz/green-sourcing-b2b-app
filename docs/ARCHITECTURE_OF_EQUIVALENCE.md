# Architecture of Equivalence Engine

## Overview

The Architecture of Equivalence engine transforms GreenChainz from a simple sustainability reporting platform into a comprehensive risk management suite. It introduces **Material Viability Profiles** with hard metrics and persona-weighted scoring to evaluate material equivalence beyond basic environmental data.

## Core Concepts

### Material Viability Profile

A comprehensive assessment of a material or product incorporating:

- **ASTM Standards Compliance** - Testing and certification data
- **Labor Units** - Installation and maintenance complexity metrics
- **OTIF Metrics** - On-Time In-Full delivery performance
- **Environmental Metrics** - GWP, embodied carbon, recyclability, Red List status
- **Health Metrics** - VOC emissions, health grades, CDPH compliance
- **Cost Metrics** - Unit pricing, TCO, price volatility

### Persona-Weighted Scoring

Different stakeholders care about different metrics. The engine calculates separate scores for:

- **Architect** (25% environmental, 25% standards, 15% health)
- **General Contractor** (25% labor, 25% delivery, 20% cost)
- **Facility Manager** (25% cost, 20% labor, 15% environmental)
- **Insurance Risk Manager** (35% standards, 30% health)
- **Flooring/Drywall Subcontractor** (35% labor, 25% delivery)
- **Distributor** (35% delivery, 25% cost)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Architecture of Equivalence                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐      ┌──────────────────┐            │
│  │ Autodesk        │      │ Scraper Agent    │            │
│  │ Interceptor     │─────▶│ (Enhanced)       │            │
│  │                 │      │                  │            │
│  │ - Revit Specs   │      │ - EPD Data       │            │
│  │ - ASTM Required │      │ - Health Data    │            │
│  │ - Material Props│      │ - Labor Data     │            │
│  └─────────────────┘      │ - OTIF Data      │            │
│                           └──────────────────┘            │
│                                   │                        │
│                                   ▼                        │
│                           ┌──────────────────┐            │
│                           │ Viability        │            │
│                           │ Profile Builder  │            │
│                           │                  │            │
│                           │ - Parse data     │            │
│                           │ - Normalize      │            │
│                           │ - Validate       │            │
│                           └──────────────────┘            │
│                                   │                        │
│                                   ▼                        │
│                           ┌──────────────────┐            │
│                           │ Scoring Engine   │            │
│                           │                  │            │
│                           │ - 6 components   │            │
│                           │ - Persona weights│            │
│                           │ - Confidence     │            │
│                           └──────────────────┘            │
│                                   │                        │
│                                   ▼                        │
│                           ┌──────────────────┐            │
│                           │ Azure PostgreSQL │            │
│                           │                  │            │
│                           │ - Store profiles │            │
│                           │ - JSONB columns  │            │
│                           │ - Fast queries   │            │
│                           └──────────────────┘            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Key Files

### Type Definitions
- **`types/schema.ts`** - Core interfaces for viability profiles, personas, scoring

### Database Layer
- **`lib/azure-db.ts`** - Direct Azure PostgreSQL connection and CRUD operations

### Scoring Engine
- **`lib/scoring/viability-scoring.ts`** - Persona-weighted scoring algorithm

### Data Sources
- **`lib/autodesk-interceptor.ts`** - Extract specs from Revit models via Autodesk Forge
- **`lib/agents/scraper/scraper-agent.ts`** - Enhanced scraper with viability data parsing

### Examples
- **`lib/examples/architecture-of-equivalence-demo.ts`** - End-to-end integration demo

## Usage

### 1. Extract Specs from Revit Model

```typescript
import { extractSpecsFromRevitModel, mockRevitExtraction } from '@/lib/autodesk-interceptor';

// Real extraction (requires Autodesk credentials)
const fileBuffer = await readFile('model.rvt');
const specs = await extractSpecsFromRevitModel(fileBuffer, 'model.rvt');

// Mock extraction (for testing)
const specs = mockRevitExtraction('model.rvt');

console.log(`Found ${specs.materials.length} materials`);
specs.materials.forEach(material => {
  console.log(`- ${material.materialName}`);
  console.log(`  ASTM: ${material.requiredStandards?.join(', ')}`);
});
```

### 2. Scrape Material Data with Viability Profile

```typescript
import { scrapeMaterialData } from '@/lib/agents/scraper/scraper-agent';

const result = await scrapeMaterialData({
  material_name: 'Interface Urban Retreat Carpet Tile',
  search_type: 'both',
  extract_fields: ['gwp_per_unit', 'health_grade', 'astm_standards'],
  save_to_db: true, // Save viability profile to Azure DB
  product_id: 123,
});

console.log(`Scraped: ${result.product_name}`);
console.log(`Viability Profile ID: ${result.viability_profile_id}`);
console.log(`GWP: ${result.gwp_per_unit} ${result.unit_type}`);
```

### 3. Build and Score Viability Profile

```typescript
import { MaterialViabilityProfile } from '@/types/schema';
import { calculateViabilityScore } from '@/lib/scoring/viability-scoring';

const profile: MaterialViabilityProfile = {
  productName: 'EcoFloor Pro',
  manufacturer: 'GreenProducts Inc',
  astmStandards: [
    { designation: 'ASTM E84', title: 'Fire Test', compliant: true },
  ],
  laborUnits: {
    installationHoursPerUnit: 0.5,
    maintenanceHoursPerYear: 2.0,
    unit: 'sq ft',
    skillLevelRequired: 2,
  },
  otifMetrics: {
    onTimePercentage: 90,
    inFullPercentage: 95,
    otifScore: 85,
    averageLeadTimeDays: 14,
    sampleSize: 100,
    dataFrom: new Date('2024-01-01'),
    dataTo: new Date('2024-12-31'),
  },
  // ... other metrics
};

// Calculate for specific persona
const result = calculateViabilityScore({
  profile,
  persona: 'Architect',
});

console.log(`Overall Score: ${result.score.overall}/100`);
console.log(`Environmental: ${result.score.environmental}/100`);
console.log(`Standards: ${result.score.standards}/100`);
console.log(`Warnings: ${result.warnings?.length || 0}`);
```

### 4. Calculate Scores for All Personas

```typescript
import { calculateViabilityScoresForAllPersonas } from '@/lib/scoring/viability-scoring';

const scores = calculateViabilityScoresForAllPersonas(profile);

console.log('Persona Scores:');
Object.entries(scores).forEach(([persona, score]) => {
  console.log(`${persona}: ${score.overall.toFixed(1)}/100`);
});
```

### 5. Save to Azure Database

```typescript
import { saveViabilityProfile, getViabilityProfileByProductId } from '@/lib/azure-db';

// Save profile
const profileId = await saveViabilityProfile(profile);
console.log(`Saved with ID: ${profileId}`);

// Retrieve profile
const retrieved = await getViabilityProfileByProductId(123);
if (retrieved) {
  console.log(`Found: ${retrieved.productName}`);
  console.log(`ASTM Standards: ${retrieved.astmStandards.length}`);
}
```

## Scoring Algorithm

The scoring algorithm evaluates materials across 6 dimensions:

### 1. Environmental Score (0-100)
- GWP/embodied carbon (lower is better)
- Recyclability (higher is better)
- Red List status (Free = +15, Contains = -20)
- EPD documentation (+10 bonus)

### 2. Labor Score (0-100)
- Installation hours (lower is better)
- Maintenance hours (lower is better)
- Skill level required (lower is better)
- Special equipment (-10 penalty)

### 3. Standards Score (0-100)
- Compliance rate (% of standards met)
- Number of standards (thoroughness bonus)
- Test recency (+10 if within 1 year)

### 4. Delivery Score (0-100)
- OTIF score (primary metric)
- Lead time (penalty for >30 days)
- Variability (std dev penalty)
- Sample size (+5 if ≥100 samples)

### 5. Cost Score (0-100)
- TCO ratio (lower is better)
- Price volatility (lower is better)
- Data availability bonus

### 6. Health Score (0-100)
- Health grade (A=100, B=75, C=50, F=0)
- VOC emissions (lower is better)
- CDPH compliance (+10 bonus)
- Formaldehyde levels

## Database Schema

The `viability_profiles` table stores all profile data:

```sql
CREATE TABLE viability_profiles (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT,
  product_name VARCHAR(255) NOT NULL,
  manufacturer VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  
  -- JSON columns for complex data
  astm_standards JSONB NOT NULL DEFAULT '[]'::jsonb,
  labor_units JSONB NOT NULL,
  otif_metrics JSONB NOT NULL,
  environmental_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  health_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  cost_metrics JSONB NOT NULL,
  viability_scores JSONB DEFAULT '{}'::jsonb,
  data_quality JSONB NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT
);
```

### Indexes
- `idx_viability_product_id` - Fast lookup by product
- `idx_viability_product_name` - Search by name
- `idx_viability_manufacturer` - Filter by manufacturer
- `idx_viability_scores` (GIN) - Query JSONB scores
- `idx_viability_astm` (GIN) - Query JSONB standards

## Testing

Run the test suite:

```bash
# Unit tests for scoring algorithm
npm test -- tests/unit/scoring/viability-scoring.test.ts

# Azure DB integration tests (mocked)
npm test -- tests/unit/scoring/azure-db.test.ts

# Run all tests
npm test
```

Run the integration demo:

```bash
npx tsx lib/examples/architecture-of-equivalence-demo.ts
```

## Environment Variables

Required environment variables:

```bash
# Azure PostgreSQL (required)
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require

# Autodesk Forge (optional, for Revit extraction)
AUTODESK_CLIENT_ID=your-client-id
AUTODESK_CLIENT_SECRET=your-client-secret

# Azure OpenAI (required for scraper)
AZURE_OPENAI_ENDPOINT=https://your-endpoint.openai.azure.com
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o

# Azure AI Search (optional, for enhanced scraping)
AZURE_SEARCH_ENDPOINT=https://your-search.search.windows.net
AZURE_SEARCH_KEY=your-search-key
AZURE_SEARCH_INDEX_NAME=supplier-websites
```

## API Routes (Future)

Planned API endpoints:

- `POST /api/viability/profiles` - Create/update viability profile
- `GET /api/viability/profiles/:id` - Get profile by ID
- `GET /api/viability/profiles/product/:productId` - Get profile by product
- `POST /api/viability/score` - Calculate viability score
- `POST /api/viability/extract/revit` - Extract from Revit model
- `GET /api/viability/search?q=...` - Search profiles

## Benefits

### For Architects
- **Standards confidence** - Verify ASTM compliance before specifying
- **Environmental leadership** - Compare GWP and embodied carbon
- **Health priority** - Ensure low VOC and CDPH compliance

### For General Contractors
- **Labor efficiency** - Understand installation complexity upfront
- **Delivery reliability** - Choose suppliers with proven OTIF performance
- **Cost predictability** - See TCO and price stability data

### For Facility Managers
- **Maintenance planning** - Know annual labor requirements
- **Cost optimization** - Balance initial price vs. TCO
- **Environmental responsibility** - Track building carbon footprint

### For Insurance Risk Managers
- **Fire safety** - Verify fire ratings and non-combustibility
- **Health compliance** - Ensure materials meet health standards
- **Testing verification** - Confirm recent ASTM test reports

## Next Steps

1. **API Endpoints** - Create REST API for viability profiles
2. **UI Dashboard** - Build admin interface for profile management
3. **Revit Plugin** - Direct integration with Revit for spec extraction
4. **Machine Learning** - Predict OTIF and labor metrics from historical data
5. **Benchmarking** - Industry-wide comparisons and percentile rankings
6. **Alerts** - Notify when better alternatives become available

## Support

For questions or issues, contact the GreenChainz development team.
