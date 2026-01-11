# Hunter Agents Architecture

## Overview

The Hunter Agents are specialized Azure Functions that **target high-leverage procurement decision-makers** rather than generic "sustainability" contacts. These agents recognize that procurement is driven by **Risk Mitigation, TCO, ROI, and Liability**—not marketing fluff.

### Key Insight

Traditional lead generation looks for "green building" or "sustainability director"—roles that may lack budget authority. Hunter Agents target **Financial Gatekeepers and Operational Stewards** who control millions in procurement decisions.

## The Three Hunter Agents

### 1. Gatekeeper Discovery Agent ✅
**Purpose**: Find decision-makers with budget authority using Azure Bing Search API

**Target Roles**:
- Quantity Surveyors (Financial Gatekeepers)
- Infection Control Officers (Healthcare Vertical)
- Insurance Risk Managers (Construction Insurance)
- Facility Directors (Operational Stewards)
- Procurement Directors (Strategic Sourcing)

**How It Works**:
1. Uses role-specific "motivation keywords" (e.g., "whole life costing", "pathogen reduction", "mass timber")
2. Searches LinkedIn and company websites via Bing Search API
3. Filters results by keyword relevance
4. Optionally qualifies leads with GPT-4o based on Strategic Procurement fit

**API Endpoint**: `POST /api/gatekeeper-discovery`

### 2. GPT-4o Qualification Agent ✅
**Purpose**: Validate if discovered profiles align with Strategic Procurement definitions

**Evaluation Criteria**:
- Strategic Procurement Fit (not generic "sustainability")
- Decision Logic Alignment (TCO, ROI, NPV, risk)
- Authority Level (budget control, C-suite influence)
- Motivation Keywords (technical/financial vs. marketing)

**Scoring**:
- **High Priority**: Strong financial focus, clear authority, aligns with decision logic
- **Medium Priority**: Some alignment, potential influence
- **Low Priority**: Generic role, lacks clear authority

**Integration**: Runs automatically when `autoQualify: true` in gatekeeper-discovery

### 3. Distributor Intelligence Agent ✅ NEW
**Purpose**: Score distributors on their ability to make compliance easy (Layer VII "Hidden Influencers")

**Target Data**:
1. **Ready-to-go Documentation** (40 points)
   - LEED documentation available and downloadable
   - EPDs available and downloadable
   - Third-party verified data

2. **Multi-functional SKUs** (25 points)
   - Products that replace multiple trades
   - "Structural Insulated Panels" instead of separate framing + insulation
   - All-in-one solutions that reduce coordination burden

3. **Inventory Transparency** (15 points)
   - Stock availability visibility
   - Lead time transparency
   - Inventory turn data

4. **Downloadable Assets** (20 points)
   - PDFs, Excel templates
   - Easy access (no login wall)
   - Complete documentation packages

**API Endpoint**: `POST /api/distributor-intelligence`

**Scoring Tiers**:
- **Top Tier** (75-100): Comprehensive documentation, multiple multi-functional SKUs, excellent transparency
- **Good** (60-74): Strong documentation, some multi-functional offerings
- **Average** (40-59): Basic documentation, limited multi-functional options
- **Poor** (0-39): Minimal documentation, poor transparency

## Architecture Components

### Directory Structure
```
backend/functions/
├── gatekeeper-discovery/
│   ├── function.json (HTTP POST trigger)
│   └── index.ts (Discovery logic)
├── distributor-intelligence/
│   ├── function.json (HTTP POST trigger)
│   └── index.ts (Scoring logic)
├── shared/
│   ├── constants/
│   │   └── gatekeepers.ts (5 gatekeeper persona definitions)
│   ├── services/
│   │   ├── BingSearchService.ts (Azure Bing Search integration)
│   │   ├── OpenAIQualificationService.ts (GPT-4o lead qualification)
│   │   └── DistributorScoreService.ts (Distributor analysis & scoring)
│   └── types/
│       ├── GatekeeperTypes.ts (Discovery & qualification types)
│       └── DistributorTypes.ts (Distributor intelligence types)
```

## API Usage

### Gatekeeper Discovery

**Request**:
```bash
POST /api/gatekeeper-discovery
Content-Type: application/json
x-functions-key: YOUR_KEY

{
  "role": "quantity_surveyor",
  "location": "United Kingdom",
  "industry": "construction",
  "maxResults": 20,
  "autoQualify": true
}
```

**Response**:
```json
{
  "success": true,
  "role": "quantity_surveyor",
  "totalDiscovered": 18,
  "leads": [
    {
      "name": "John Smith, MRICS",
      "company": "Turner & Townsend",
      "profileUrl": "https://linkedin.com/in/...",
      "bio": "Quantity Surveyor specializing in whole life costing...",
      "matchedKeywords": ["whole life costing", "carbon accounting", "npv"],
      "relevanceScore": 87,
      "priority": "high",
      "qualificationStatus": "qualified",
      "qualificationNotes": "Strong focus on WLC and embodied carbon..."
    }
  ],
  "metadata": {
    "searchQueries": [...],
    "resultsProcessed": 156,
    "qualifiedLeads": 12,
    "searchedAt": "2026-01-11T21:00:00Z"
  }
}
```

### Distributor Intelligence

**Request**:
```bash
POST /api/distributor-intelligence
Content-Type: application/json
x-functions-key: YOUR_KEY

{
  "websiteUrl": "https://www.sourcewell-mn.gov",
  "name": "Sourcewell",
  "type": "coop_purchasing",
  "deepScan": false
}
```

**Response**:
```json
{
  "success": true,
  "intelligence": {
    "distributor": {
      "name": "Sourcewell",
      "website": "https://www.sourcewell-mn.gov",
      "type": "coop_purchasing"
    },
    "compliance": {
      "leedDocs": {
        "available": true,
        "downloadable": true,
        "formats": ["PDF", "Excel"],
        "urls": ["https://..."]
      },
      "epdDocs": {
        "available": true,
        "downloadable": true,
        "thirdPartyVerified": true,
        "urls": ["https://..."]
      },
      "easeScore": 90
    },
    "inventory": {
      "multiFunctionalSKUs": [
        {
          "sku": "MF-1",
          "name": "Structural Insulated Panel System",
          "replacedTrades": ["structural", "insulation", "vapor barrier"],
          "costSavings": "30% reduction",
          "evidence": ["multi-functional", "replaces multiple trades"]
        }
      ],
      "stockTransparency": true,
      "leadTimes": {
        "standard": "4-6 weeks"
      }
    },
    "score": {
      "overall": 82,
      "complianceScore": 90,
      "multiFunctionalScore": 18,
      "adminBurdenScore": 80,
      "breakdown": {
        "readyToGoDocumentation": 40,
        "downloadableAssets": 20,
        "multiFunctionalSKUs": 18,
        "inventoryTransparency": 15
      },
      "tier": "top",
      "strengths": [
        "Comprehensive compliance documentation",
        "Easy-to-access downloadable assets",
        "Excellent inventory transparency"
      ],
      "weaknesses": [],
      "scoredAt": "2026-01-11T21:00:00Z"
    }
  },
  "summary": {
    "overallScore": 82,
    "tier": "top",
    "topStrengths": [
      "Comprehensive compliance documentation",
      "Easy-to-access downloadable assets"
    ],
    "readyForCompliance": true
  }
}
```

## Gatekeeper Personas

### 1. Quantity Surveyor (Financial Gatekeeper)
**Vertical**: Commercial Construction  
**Motivation Keywords**:
- whole life costing, wlc
- carbon accounting
- net present value, npv
- life cycle cost
- cost certainty, value engineering
- embodied carbon, carbon budget
- capex vs opex

**Decision Logic**: ROI, NPV, Cost Analysis, Financial Metrics, Risk

**Why They Matter**: Control budget approvals for major projects. Focus on 20-year cost models, not upfront price.

### 2. Infection Control Officer (Healthcare Gatekeeper)
**Vertical**: Healthcare  
**Motivation Keywords**:
- pathogen reduction
- seamless flooring
- uv-c cleaning
- antimicrobial
- hospital acquired infection (HAI)
- surface hygiene, bioburden
- disinfection protocol

**Decision Logic**: Risk, Compliance, Technical Specs, Maintenance

**Why They Matter**: Veto power on any flooring that increases infection risk. Care about cleanability, not "eco-friendly."

### 3. Insurance Risk Manager
**Vertical**: Construction Insurance  
**Motivation Keywords**:
- mass timber
- climate resilience, seismic resilience
- risk mitigation, liability exposure
- builders risk
- fire resistance, catastrophic loss
- underwriting criteria

**Decision Logic**: Risk, Liability, Compliance, Financial Stability

**Why They Matter**: Determine insurability of projects. Mass timber adoption depends on their approval.

### 4. Facility Director (Operational Steward)
**Vertical**: Corporate Real Estate  
**Motivation Keywords**:
- total cost of ownership (TCO)
- preventive maintenance
- asset lifecycle
- operational efficiency
- building performance
- deferred maintenance, capex planning

**Decision Logic**: TCO, Maintenance, Lifecycle, Durability, Operations

**Why They Matter**: Manage portfolios worth hundreds of millions. Care about 10-year maintenance costs.

### 5. Procurement Director (Strategic Sourcing)
**Vertical**: Construction & Real Estate  
**Motivation Keywords**:
- strategic sourcing
- supply chain risk
- vendor financial stability
- contract strategy
- supplier diversity
- vendor risk assessment

**Decision Logic**: Risk, Liability, Financial Stability, Supply Chain, TCO

**Why They Matter**: C-suite level. Set procurement policy for entire organizations.

## Distributor Scoring Algorithm

### Scoring Breakdown (100 points total)

1. **Ready-to-go Documentation** (40 points)
   - LEED docs available: 10 pts
   - LEED docs downloadable: 10 pts
   - EPD docs available: 10 pts
   - EPD docs downloadable: 10 pts

2. **Downloadable Assets** (20 points)
   - LEED URLs found: 7 pts
   - EPD URLs found: 7 pts
   - HPD downloadable: 6 pts

3. **Multi-functional SKUs** (25 points)
   - Has multi-functional products: 10 pts
   - 3+ multi-functional SKUs: 8 pts
   - 5+ multi-functional SKUs: 7 pts

4. **Inventory Transparency** (15 points)
   - Stock transparency: 8 pts
   - Lead times published: 7 pts

### Administrative Burden Reduction

The key metric: **Does this distributor make compliance EASY?**

High scorers:
- ✅ One-click download of all compliance docs
- ✅ Pre-packaged LEED documentation
- ✅ Third-party verified data (no verification burden)
- ✅ Multi-functional products reduce coordination complexity

Low scorers:
- ❌ "Contact us for documentation"
- ❌ Login required for basic info
- ❌ No clear SKU structure
- ❌ Generic sustainability claims without data

## Environment Variables

```bash
# Bing Search API (for Gatekeeper Discovery)
BING_SEARCH_API_KEY=your-bing-api-key
BING_SEARCH_ENDPOINT=https://api.bing.microsoft.com/v7.0/search

# Azure OpenAI GPT-4o (for Lead Qualification)
AZURE_OPENAI_ENDPOINT=https://your-openai.openai.azure.com/
AZURE_OPENAI_API_KEY=your-openai-key
AZURE_OPENAI_DEPLOYMENT=gpt-4o
AZURE_OPENAI_API_VERSION=2024-10-21
```

## Integration with Database

### Recommended Tables

```sql
-- Discovered leads
CREATE TABLE discovered_leads (
  id SERIAL PRIMARY KEY,
  role VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  profile_url TEXT NOT NULL,
  bio TEXT,
  matched_keywords JSONB,
  relevance_score INT,
  qualification_status VARCHAR(50),
  priority VARCHAR(20),
  qualification_notes TEXT,
  discovered_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Distributor scores
CREATE TABLE distributor_scores (
  id SERIAL PRIMARY KEY,
  distributor_name VARCHAR(255) NOT NULL,
  website TEXT NOT NULL,
  distributor_type VARCHAR(100),
  overall_score INT NOT NULL,
  compliance_score INT,
  multi_functional_score INT,
  admin_burden_score INT,
  tier VARCHAR(20),
  strengths JSONB,
  weaknesses JSONB,
  compliance_data JSONB,
  inventory_data JSONB,
  scored_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_leads_role ON discovered_leads(role);
CREATE INDEX idx_leads_priority ON discovered_leads(priority);
CREATE INDEX idx_distributors_tier ON distributor_scores(tier);
CREATE INDEX idx_distributors_score ON distributor_scores(overall_score DESC);
```

## Use Cases

### Use Case 1: Target Quantity Surveyors in UK
```bash
POST /api/gatekeeper-discovery
{
  "role": "quantity_surveyor",
  "location": "United Kingdom",
  "maxResults": 50,
  "autoQualify": true
}
```

Result: List of UK quantity surveyors mentioning "whole life costing" and "carbon accounting", scored by GPT-4o.

### Use Case 2: Score Sourcewell vs. Traditional Distributor
```bash
# Score Sourcewell
POST /api/distributor-intelligence
{"websiteUrl": "https://www.sourcewell-mn.gov"}

# Score traditional distributor
POST /api/distributor-intelligence
{"websiteUrl": "https://www.distributor-example.com"}
```

Result: Sourcewell likely scores higher due to ready-to-go compliance docs designed for government procurement.

### Use Case 3: Find Healthcare Infection Control Decision-Makers
```bash
POST /api/gatekeeper-discovery
{
  "role": "infection_control_officer",
  "location": "United States",
  "industry": "hospital",
  "maxResults": 30,
  "autoQualify": true
}
```

Result: ICOs mentioning "seamless flooring" and "pathogen reduction"—NOT generic "sustainable healthcare."

## Testing

### Test Gatekeeper Discovery (without Bing API)
```javascript
// Uses default personas and returns mock data
const persona = getGatekeeperPersona('quantity_surveyor');
console.log(persona.motivationKeywords);
// Output: ["whole life costing", "wlc", "carbon accounting", ...]
```

### Test Distributor Scoring
```bash
# Test with a known compliant distributor
POST /api/distributor-intelligence
{
  "websiteUrl": "https://www.armstrong.com",
  "name": "Armstrong Flooring",
  "type": "national_distributor"
}
```

Expected: High scores for LEED/EPD documentation if available.

## Performance Considerations

### Gatekeeper Discovery
- **Bing Search API**: 1000 free transactions/month (Bing Search API Free Tier)
- **Rate Limiting**: 1.5 seconds between queries (configurable)
- **Caching**: 1-hour result cache per query
- **GPT-4o Qualification**: ~$0.01 per lead (with GPT-4o pricing)

### Distributor Intelligence
- **Scraping**: 15-second timeout per website
- **Rate Limiting**: 2 seconds between distributors (batch mode)
- **Caching**: Results stored in database, re-score weekly

### Cost Optimization
- Cache Bing Search results aggressively
- Batch GPT-4o qualification (3 concurrent)
- Use lower-cost GPT-4o-mini for initial filtering, GPT-4o for final qualification

## Troubleshooting

### Issue: "Bing Search API key not configured"
**Solution**: Set `BING_SEARCH_API_KEY` in Function App settings

### Issue: "No leads found"
**Solution**: 
- Check motivation keywords are appropriate for industry
- Try broader location filter
- Verify Bing Search API quota not exhausted

### Issue: Distributor score = 0
**Solution**:
- Website may not have downloadable documentation
- Try `deepScan: true` for more thorough analysis
- Check if website blocks scraping (403/401 errors)

### Issue: GPT-4o qualification fails
**Solution**:
- Verify `AZURE_OPENAI_DEPLOYMENT=gpt-4o` (not gpt-4o-mini)
- Check API quota and rate limits
- Review OpenAI service logs in Azure Portal

## Roadmap

### Phase 3: Database Integration
- [ ] Store discovered leads in PostgreSQL
- [ ] Store distributor scores in PostgreSQL
- [ ] Create API endpoints for querying results
- [ ] Add update/refresh logic

### Phase 4: Workflow Automation
- [ ] Schedule daily gatekeeper discovery (Azure Logic App)
- [ ] Auto-score new distributors added to database
- [ ] Email alerts for high-priority leads
- [ ] CRM integration (HubSpot, Salesforce)

### Phase 5: Intelligence Enhancements
- [ ] LinkedIn Sales Navigator integration (deeper profiles)
- [ ] Company financials from D&B API
- [ ] Competitor analysis (who else is this QS working with?)
- [ ] Relationship mapping (who knows whom?)

---

**Last Updated**: 2026-01-11  
**Version**: 2.0.0  
**Author**: GreenChainz Engineering Team
