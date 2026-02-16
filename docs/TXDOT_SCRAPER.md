# TXDOT Bid Tab Scraper Documentation

## Overview

The TXDOT Bid Tab Scraper extracts real-world construction material pricing data from Texas Department of Transportation (TXDOT) bid tabulation pages. This provides **free, accurate, regional pricing benchmarks** for the GreenChainz swap validation engine.

## Data Source

- **URL**: https://www.dot.state.tx.us/insdtdot/orgchart/cmd/cserve/bidtab/BidTot01.htm
- **Pages**: 36 pages of bid totals (updated monthly)
- **Format**: HTML pages with project-level bid summaries
- **Coverage**: Texas statewide construction projects

## Architecture

### Components

1. **Parser** (`server/services/txdotParserSimple.ts`)
   - Parses markdown/text format extracted from TXDOT pages
   - Extracts project metadata (county, type, contract, bids)
   - Maps project types to material categories
   - Calculates estimated price per unit

2. **Database Service** (`server/services/pricingDataService.ts`)
   - Stores pricing data in `pricing_data` table
   - Auto-creates material placeholders for new categories
   - Detects and skips duplicate records
   - Updates material average pricing

3. **tRPC Router** (`server/routers/txdotScraper.ts`)
   - `runScraper` mutation (admin-only, supports dry-run)
   - `getRegionalPricing` query (public, filters by state/county)
   - `getScraperStatus` query (returns last run info)

### Data Flow

```
TXDOT HTML Page
  ↓
Browser Navigation (extract markdown)
  ↓
txdotParserSimple.parseMarkdownText()
  ↓
projectToPricingData() (material categorization)
  ↓
pricingDataService.storePricingData()
  ↓
pricing_data table + materials table
```

## Material Categorization

The scraper maps TXDOT project types to construction material categories:

| Project Type | Material Category | Unit | Confidence |
|---|---|---|---|
| FLEXIBLE BASE | Flexible Base Material | CY | 70% |
| PORTLAND CEMENT CONCRETE | Portland Cement Concrete | CY | 80% |
| CONCRETE PAVEMENT | Concrete Pavement | SY | 75% |
| ASPHALT CONCRETE | Asphalt Concrete | TON | 80% |
| HOT MIX ASPHALT | Hot Mix Asphalt | TON | 80% |
| CRACK SEAL | Crack Sealant | LB | 70% |
| REFLECTIVE PAVEMENT MARKINGS | Reflective Pavement Markings | LF | 65% |
| STORM SEWER | Storm Sewer Pipe | LF | 60% |

**Confidence Score**: Indicates data quality (50% = generic category, 80% = specific material match)

## Usage

### Running the Scraper (Manual)

**Dry Run** (test without database writes):
```typescript
const result = await trpc.txdotScraper.runScraper.mutate({ dryRun: true });
console.log(`Scraped ${result.recordsScraped} records`);
console.log('Sample data:', result.sampleData);
```

**Production Run**:
```typescript
const result = await trpc.txdotScraper.runScraper.mutate({ dryRun: false });
console.log(`Inserted ${result.recordsInserted} new records`);
console.log(`Skipped ${result.recordsSkipped} duplicates`);
```

### Querying Regional Pricing

```typescript
// Get all Texas pricing
const txPricing = await trpc.txdotScraper.getRegionalPricing.query({ 
  state: 'TX' 
});

// Get Harris County pricing
const harrisPricing = await trpc.txdotScraper.getRegionalPricing.query({ 
  state: 'TX',
  county: 'HARRIS'
});
```

## Database Schema

### pricing_data Table

```sql
CREATE TABLE pricing_data (
  id INT PRIMARY KEY AUTO_INCREMENT,
  materialId INT NOT NULL,
  pricePerUnit DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  state VARCHAR(2),
  county VARCHAR(100),
  source VARCHAR(100) NOT NULL,  -- 'TXDOT_BID_TAB'
  sourceDate TIMESTAMP,
  sourceUrl TEXT,
  projectName VARCHAR(255),
  contractNumber VARCHAR(100),
  dataConfidence INT,  -- 0-100
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

## Limitations & Future Improvements

### Current Limitations

1. **Price Estimation**: Uses `winningBid / 1000` as placeholder unit price (not actual per-unit pricing)
2. **Material Coverage**: Only ~15 material categories mapped (out of 100+ project types)
3. **No Quantity Data**: TXDOT bid totals don't include item-level quantities
4. **Manual Trigger**: Requires admin to manually run scraper

### Planned Improvements

1. **PDF Parsing**: Extract item-level pricing from detailed bid tab PDFs
2. **Expanded Mapping**: Add 50+ more project type → material category mappings
3. **Scheduled Runs**: Auto-run scraper monthly to keep pricing current
4. **Multi-State Support**: Add WSDOT (Washington), Caltrans (California), NCDOT (North Carolina)
5. **Labor Cost Extraction**: Parse labor rates from bid tabs

## Testing

### Unit Test

```bash
# Test parser with sample data
node /tmp/test-parser-simple.mjs
```

**Expected Output**:
```
✅ Parsed 4 projects

--- Project 1 ---
County: STERLING
Type: MOWING HIGHWAY RIGHT OF WAY
Winning Bid: $181,295.70 (+8.03%)
Estimated Price/Unit: $181.30
```

### Integration Test

```typescript
// Test full scraper pipeline
const result = await trpc.txdotScraper.runScraper.mutate({ dryRun: true });
assert(result.recordsScraped > 0);
assert(result.sampleData.length > 0);
```

## Maintenance

### Monthly Updates

TXDOT updates bid tabulations monthly. Run scraper after each update:

1. Navigate to https://www.dot.state.tx.us/insdtdot/orgchart/cmd/cserve/bidtab/BidTot01.htm
2. Check "Last Update" date
3. If new data available, run scraper: `trpc.txdotScraper.runScraper.mutate({ dryRun: false })`

### Data Quality Checks

- **Confidence Score**: Average should be >60%
- **Duplicate Rate**: Should be >80% after first run (indicates good duplicate detection)
- **Material Coverage**: Should increase over time as more project types are mapped

## Support

For issues or questions:
- **Code**: `server/services/txdotParserSimple.ts`, `server/services/pricingDataService.ts`
- **API**: `server/routers/txdotScraper.ts`
- **Documentation**: This file

## References

- TXDOT Bid Tabulations Dashboard: https://www.txdot.gov/business/road-bridge-maintenance/contract-letting/bid-tabulations-dashboard.html
- TXDOT Contract Letting: https://www.txdot.gov/business/road-bridge-maintenance/contract-letting.html
