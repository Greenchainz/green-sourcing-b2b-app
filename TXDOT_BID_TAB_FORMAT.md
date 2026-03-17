# TXDOT Bid Tab Format Analysis

**Date:** February 15, 2026  
**Purpose:** Document TXDOT bid tabulation data structure for scraper implementation

---

## Data Source

**Primary Source:** TXDOT Bid Tabulations Dashboard  
**Archive:** https://www.dot.state.tx.us/insdtdot/orgchart/cmd/cserve/bidtab/BidTot01.htm  
**Format:** HTML pages with links to detailed bid tabulations

---

## Bid Totals Page Structure

### Project Header Information
- **County:** Project location (e.g., "TRINITY", "GALVESTON", "HARRIS")
- **Type:** Project type (e.g., "FLEXIBLE BASE", "MOWING HIGHWAY RIGHT OF WAY", "CRACK SEAL")
- **Time:** Project duration (e.g., "180 CALENDAR DAYS", "90 CALENDAR DAYS")
- **Highway:** Highway designation (e.g., "US0287", "FM1764", "SH0249")
- **Length:** Project length in miles
- **Limits From/To:** Project start and end locations
- **Let Date:** Bid opening date (e.g., "08/06/24")
- **Seq No:** Sequence number
- **Project ID:** Unique project identifier (e.g., "MMC - 647074001")
- **Contract #:** Contract number (e.g., "08241160")
- **CCSJ:** Control-Section-Job number (e.g., "6470-74-001")
- **Check:** Bid bond amount (e.g., "$4,000")

### Bid Information
- **Estimate:** TXDOT engineer's estimate (e.g., "$210,000.00")
- **Bidder 1-N:** Contractor bids with:
  - Bid amount (e.g., "$203,500.00")
  - % Over/Under estimate (e.g., "-3.10%")
  - Company name (e.g., "TEXAS MATERIALS GROUP, INC.")

---

## Sample Projects (August 2024)

### Project 1: Flexible Base
- **County:** TRINITY
- **Type:** FLEXIBLE BASE/TY E/TRINITY (POLK & SAN JAC)
- **Estimate:** $210,000.00
- **Bidder 1:** $203,500.00 (-3.10%) - TEXAS MATERIALS GROUP, INC.
- **Bidder 2:** $209,500.00 (-0.24%) - TOUCHSTONE RESOURCES, LLC

### Project 2: Mowing
- **County:** GALVESTON
- **Type:** MOWING HIGHWAY RIGHT OF WAY
- **Estimate:** $263,367.50
- **Bidder 1:** $269,911.48 (+2.48%) - GREEN SAGE SERVICES LLC
- **Bidder 2:** $342,868.80 (+30.19%) - BOEN LANDSCAPING & IRRIGATION, LLC

### Project 3: Pavement Markings
- **County:** WALLER
- **Type:** REFLECTIVE PAVEMENT MARKINGS (GRAPHICS)
- **Estimate:** $215,820.00
- **Bidder 1:** $177,113.92 (-17.93%) - TRP INFRASTRUCTURE SERVICES, LLC
- **Bidder 2:** $194,232.00 (-10.00%) - PROFESSIONAL TRAFFIC CONTROL LLC

### Project 4: Storm Sewer
- **County:** HARRIS
- **Type:** STORM SEWER SYSTEM CLEANING
- **Estimate:** $327,837.50
- **Bidder 1:** $322,137.50 (-1.74%) - AIMS COMPANIES
- **Bidder 2:** $419,125.07 (+27.85%) - SHALOM SERVICES CORPORATION

### Project 5: Crack Seal
- **County:** BRAZORIA
- **Type:** CRACK SEAL
- **Estimate:** (amount truncated in sample)
- **Time:** 90 CALENDAR DAYS

---

## Detailed Bid Tabulation Format (Per-Item Breakdown)

Based on TXDOT documentation, detailed bid tabulations include:

### Item-Level Data Columns
1. **Item Number:** Line item number (e.g., "0001", "0002")
2. **Description:** Material/work description (e.g., "PORTLAND CEMENT CONCRETE (TYPE C)", "ASPHALT CONCRETE")
3. **Quantity:** Amount of material/work
4. **Unit:** Unit of measurement (e.g., "CY" = cubic yard, "SF" = square foot, "LF" = linear foot, "EA" = each, "TON")
5. **Unit Price:** Price per unit from each bidder
6. **Amount:** Total cost (Quantity × Unit Price)

### Example Item-Level Data Structure
```
Item | Description                        | Qty    | Unit | Bidder 1 Price | Bidder 1 Amount | Bidder 2 Price | Bidder 2 Amount
-----|---------------------------------------|--------|------|----------------|-----------------|----------------|----------------
0001 | PORTLAND CEMENT CONCRETE (TYPE C)     | 150    | CY   | $140.00        | $21,000.00      | $145.00        | $21,750.00
0002 | ASPHALT CONCRETE (TYPE D)             | 500    | TON  | $85.00         | $42,500.00      | $82.50         | $41,250.00
0003 | STEEL REINFORCING (GRADE 60)          | 2000   | LB   | $1.20          | $2,400.00       | $1.15          | $2,300.00
```

---

## Data Extraction Strategy

### Phase 1: HTML Scraping (Bid Totals Pages)
**Target:** Summary-level pricing data  
**Source:** https://www.dot.state.tx.us/insdtdot/orgchart/cmd/cserve/bidtab/BidTot01.htm  
**Data Points:**
- Project location (county, city)
- Project type (material category proxy)
- Engineer's estimate (baseline pricing)
- Winning bid amount
- Bid date (for pricing currency)

**Pros:**
- Easy to scrape (HTML format)
- No PDF parsing required
- Large volume of projects (36 pages × ~20 projects/page = 720+ projects)

**Cons:**
- No per-item material breakdown
- Project-level totals only
- Material type inference from project description

### Phase 2: PDF Scraping (Detailed Bid Tabulations)
**Target:** Item-level material pricing  
**Source:** Individual project bid tab PDFs (linked from project pages)  
**Data Points:**
- Material name (from description column)
- Quantity and unit
- Unit price from multiple bidders
- Total amount

**Pros:**
- Granular material-level pricing
- Multiple bidder quotes for price validation
- Exact material specifications

**Cons:**
- PDF parsing complexity
- Variable PDF formats across projects
- Requires downloading and processing individual files

---

## Scraper Implementation Plan

### MVP Approach: HTML Scraping Only
**Rationale:** Faster implementation, sufficient for initial pricing data

**Steps:**
1. Scrape all 36 pages of bid totals (https://www.dot.state.tx.us/insdtdot/orgchart/cmd/cserve/bidtab/BidTot01.htm through BidTot36.htm)
2. Extract project-level data:
   - County (location proxy)
   - Project type (material category inference)
   - Engineer's estimate (baseline cost)
   - Winning bid (actual cost)
   - Bid date (pricing timestamp)
3. Map project types to material categories:
   - "FLEXIBLE BASE" → Concrete/Base materials
   - "CRACK SEAL" → Sealants/Coatings
   - "ASPHALT CONCRETE" → Asphalt materials
   - "STEEL REINFORCING" → Steel materials
4. Store in `pricing_data` table with:
   - `material_id`: Inferred from project type
   - `price_per_unit`: Calculated from total bid / estimated quantity
   - `state`: "TX"
   - `county`: From project header
   - `source`: "TXDOT_BID_TAB"
   - `source_date`: Bid let date
   - `source_url`: Link to bid totals page

### Future Enhancement: PDF Scraping
**When:** After MVP validation  
**Approach:**
1. Download individual project PDF bid tabs
2. Parse PDF tables using pdf-parse or pdfjs-dist
3. Extract item-level data (description, quantity, unit, unit price)
4. Normalize material names (e.g., "PORTLAND CEMENT CONCRETE (TYPE C)" → "Portland Cement")
5. Store granular pricing data with higher confidence scores

---

## Material Category Mapping

### Common TXDOT Project Types → Material Categories

| TXDOT Project Type | Material Category | Notes |
|--------------------|-------------------|-------|
| FLEXIBLE BASE | Concrete, Base Materials | Includes cement, aggregate |
| ASPHALT CONCRETE | Asphalt | Hot mix asphalt, surface treatments |
| CRACK SEAL | Sealants, Coatings | Crack sealers, joint sealants |
| PORTLAND CEMENT CONCRETE | Concrete | Structural concrete |
| STEEL REINFORCING | Steel | Rebar, structural steel |
| STORM SEWER | Pipe, Drainage | Concrete pipe, metal pipe |
| PAVEMENT MARKINGS | Coatings | Thermoplastic, paint |
| MOWING | Labor | Not material-related |
| GUARDRAIL | Steel, Safety | Steel guardrail systems |

---

## Next Steps

1. ✅ Document TXDOT bid tab format
2. Build HTML scraper for bid totals pages
3. Implement material category mapping logic
4. Create database insertion service
5. Test with August 2024 data (36 pages)
6. Validate pricing data accuracy
7. Schedule periodic scraper runs (monthly)
8. (Future) Implement PDF scraper for item-level data

---

**Document Owner:** Manus AI Agent  
**Last Updated:** February 15, 2026  
**Status:** Research Complete - Ready for Implementation
