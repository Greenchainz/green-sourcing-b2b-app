# Defensibility Agent (Anti-Value Engineering)

## Overview

The Defensibility Agent is a specialized tool designed to prevent "value engineering" - the practice of swapping out specified products for cheaper alternatives that may have inferior environmental or health performance. This agent provides objective, data-driven verification and comparison tools for specification writers and architects.

## Business Problem

**Value Engineering Risk**: Contractors and suppliers often propose "or equal" substitutions claiming products are equivalent, but lacking the same sustainability certifications or performance metrics. Without automated verification, architects must manually review complex EPDs and certificates, risking:

- Projects losing LEED/WELL points
- Higher carbon footprints (undermining net-zero goals)
- Worse indoor air quality
- Liability issues for the design team

## Solution

The Defensibility Agent provides three key capabilities:

1. **Certificate Verification** - Automated detection of CDPH v1.2 and verified EPD certifications
2. **Defensibility Scoring** - 0-100 score indicating how defensible a product specification is
3. **"Or Equal" Comparison** - Side-by-side product analysis with auto-generated rejection memos

## Key Features

### 1. Certificate Verification

**Operational Layer - Design Authorities:**
- ✅ CDPH v1.2 Certificate Detection
- ✅ Certificate number extraction
- ✅ Expiry date validation

**Financial Gatekeepers:**
- ✅ Verified EPD Detection (third-party verified only)
- ✅ EPD number and program operator
- ✅ Validity period checking

### 2. Defensibility Scoring (0-100)

The agent calculates a defensibility score based on:

| Criteria | Points | Description |
|----------|--------|-------------|
| CDPH v1.2 Certificate | 20 | Third-party health verification |
| Verified EPD | 20 | Environmental impact data |
| GWP Data | 15 | Carbon footprint documented |
| Recycled Content | 15 | Circular economy metrics |
| VOC Data | 15 | Indoor air quality data |
| Compliance Pass | 15 | Health & safety compliance |

**Defensibility Thresholds:**
- **≥ 60 points**: Defensible specification (missing ≤1 requirement)
- **< 60 points**: Vulnerable to substitution challenges

### 3. "Or Equal" Test

When a substitute is proposed, the agent:

1. **Extracts metrics** from both original and substitute documents
2. **Compares** carbon footprint, health metrics, and certifications
3. **Calculates deltas** (positive = substitute is worse)
4. **Renders verdict**: Acceptable, Review, or Reject
5. **Auto-generates rejection memo** for architect signature

**Rejection Triggers:**
- Carbon footprint > 10% higher
- Any degradation in health metrics (VOC, formaldehyde)
- Missing certifications (CDPH or EPD)

## Architecture

### Components

```
lib/types/defensibility.ts
├── CertificateVerification
├── EPDMetrics
├── HealthMetrics
├── ProductData
├── ProductComparison
├── RejectionMemo
└── DefensibilityResult

lib/agents/defensibility-agent.ts
├── extractCertificates()
├── extractEPDMetrics()
├── extractHealthMetrics()
├── checkDefensibility()
├── compareProducts()
├── generateRejectionMemo()
└── performDefensibilityCheck()

backend/services/azure/defensibilityService.js
├── All TypeScript agent functions (CommonJS)
├── enhanceComparisonWithAI() - Azure OpenAI integration
└── performOrEqualComparison() - Main orchestrator

backend/routes/documentAI.js
├── POST /api/v1/ai/check-defensibility
└── POST /api/v1/ai/compare-products
```

## API Endpoints

### 1. Check Product Defensibility

**Endpoint:** `POST /api/v1/ai/check-defensibility`

**Authentication:** Required (Supplier, Admin roles)

**Request:**
```bash
curl -X POST http://localhost:3001/api/v1/ai/check-defensibility \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "document=@product-certificate.pdf" \
  -F "productName=EcoFloor Pro" \
  -F "manufacturer=Premium Flooring Inc."
```

**Response:**
```json
{
  "message": "Defensibility check complete",
  "productData": {
    "productName": "EcoFloor Pro",
    "manufacturer": "Premium Flooring Inc.",
    "certificates": {
      "hasCDPHv12": true,
      "hasVerifiedEPD": true,
      "cdphCertificateNumber": "CDPH-2024-001",
      "epdNumber": "EPD-12345-2024"
    },
    "epdMetrics": {
      "globalWarmingPotential": 2.5,
      "gwpUnit": "kg CO2 eq",
      "recycledContent": 45
    },
    "healthMetrics": {
      "vocEmissions": 50,
      "compliance": "Pass"
    }
  },
  "isDefensible": true,
  "defensibilityScore": 80,
  "missingRequirements": [],
  "strengths": [
    "CDPH v1.2 certified for health & safety",
    "Verified EPD with environmental data",
    "Documented carbon footprint: 2.5 kg CO2 eq",
    "Contains 45% recycled content",
    "VOC emissions: 50 μg/m³"
  ],
  "vulnerabilities": [],
  "recommendations": [],
  "analysisTimeMs": 2453
}
```

### 2. Compare Products ("Or Equal" Test)

**Endpoint:** `POST /api/v1/ai/compare-products`

**Authentication:** Required (Admin, Buyer roles)

**Request:**
```bash
curl -X POST http://localhost:3001/api/v1/ai/compare-products \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "originalDocument=@original-epd.pdf" \
  -F "substituteDocument=@substitute-epd.pdf" \
  -F "originalName=Premium Insulation A" \
  -F "originalManufacturer=Quality Materials Inc." \
  -F "substituteName=Economy Insulation B" \
  -F "substituteManufacturer=Budget Materials Co." \
  -F "projectName=Downtown Office Tower" \
  -F "specSection=Section 07 21 00 - Thermal Insulation" \
  -F "architect=Jane Smith, AIA"
```

**Response (Reject case):**
```json
{
  "message": "\"Or Equal\" comparison complete",
  "comparison": {
    "original": { ... },
    "substitute": { ... },
    "environmentalComparison": {
      "carbonDelta": 2.6,
      "carbonDeltaPercent": 81.2
    },
    "healthComparison": {
      "vocDelta": 45,
      "formaldehydeDelta": 9,
      "overallHealthScore": "Worse"
    },
    "certificateComparison": {
      "originalCertified": true,
      "substituteCertified": false,
      "certificateDowngrade": true
    },
    "overallVerdict": "Reject",
    "reasons": [
      "Substitute has 81.2% higher carbon footprint",
      "Substitute has higher VOC emissions (+45.0 μg/m³)",
      "Substitute lacks CDPH v1.2 certification"
    ],
    "aiAnalysis": "The substitute product shows significantly worse environmental and health performance. The 81% increase in carbon footprint alone disqualifies this substitution under typical sustainability requirements. The lack of CDPH v1.2 certification presents additional concerns for indoor air quality compliance. Recommendation: Reject substitution."
  },
  "verdict": "Reject",
  "rejectionMemo": {
    "title": "Product Substitution Rejection Notice",
    "date": "2026-01-11",
    "projectName": "Downtown Office Tower",
    "specSection": "Section 07 21 00 - Thermal Insulation",
    "originalProduct": "Premium Insulation A (Quality Materials Inc.)",
    "substituteProduct": "Economy Insulation B (Budget Materials Co.)",
    "rejectionReasons": [
      "Substitute has 81.2% higher carbon footprint",
      "Substitute has higher VOC emissions (+45.0 μg/m³)",
      "Substitute has higher formaldehyde emissions",
      "Substitute lacks CDPH v1.2 certification",
      "Substitute lacks verified EPD"
    ],
    "comparisonSummary": "...",
    "carbonImpact": "The substitute product has a 81.2% higher carbon footprint (2.60 kg CO2 eq increase), which conflicts with the project's sustainability goals.",
    "healthImpact": "The substitute product has worse indoor air quality metrics...",
    "recommendedAction": "Retain the originally specified product or provide an alternate that meets or exceeds all environmental and health criteria.",
    "architectSignature": {
      "name": "Jane Smith, AIA",
      "date": "2026-01-11",
      "title": "Project Architect"
    },
    "attachments": [
      "Original Product EPD",
      "Substitute Product EPD (if available)",
      "Comparative Analysis Report"
    ]
  },
  "analysisTimeMs": 5832
}
```

## Extraction Patterns

### CDPH v1.2 Certificate
```javascript
// Version detection
/cdph\s*(?:v|version)?\s*1\.2/i

// Certificate number
/cdph\s*(?:certificate|cert)?[\s#:]*([A-Z0-9-]+)/i

// Dates
/(?:issue|issued)\s*date[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
```

### Verified EPD
```javascript
// Verification status
/(?:verified|third[-\s]party\s*verified|independently\s*verified)\s*epd/i

// EPD number
/epd\s*(?:number|no|#)[:\s]*([A-Z0-9-]+)/i

// Program operator
/program\s*operator[:\s]*([^\n]+)/i
```

### Environmental Metrics
```javascript
// GWP
/(?:gwp|global\s*warming\s*potential)[:\s]*([0-9.]+)\s*(?:kg\s*co2|kgco2)/i

// Recycled content
/(?:recycled|post[-\s]consumer)\s*content[:\s]*([0-9.]+)\s*%/i
```

### Health Metrics
```javascript
// VOC emissions
/(?:total\s*)?voc\s*(?:emissions)?[:\s]*([0-9.]+)\s*(?:μg\/m³|ug\/m3)/i

// Formaldehyde
/formaldehyde[:\s]*([0-9.]+)\s*(?:μg\/m³|ug\/m3)/i

// Compliance
/pass(?:ed)?|compliant/i  // Pass
/fail(?:ed)?|non[-]?compliant/i  // Fail
```

## Azure OpenAI Enhancement

When Azure OpenAI is configured, the agent enhances comparisons with AI-powered analysis:

**Environment Variables:**
```bash
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
```

**AI Analysis Example:**
```
The substitute product shows significantly worse environmental and 
health performance. The 81% increase in carbon footprint alone 
disqualifies this substitution under typical sustainability requirements. 
The lack of CDPH v1.2 certification presents additional concerns for 
indoor air quality compliance. Recommendation: Reject substitution.
```

## Rejection Memo Format

The auto-generated rejection memo is designed to be:
- **Legally defensible** - Objective data-driven analysis
- **Professional** - Ready for architect signature
- **Comprehensive** - All relevant metrics and deltas
- **Actionable** - Clear recommendation

**Memo Sections:**
1. Project identification (name, spec section)
2. Product comparison (original vs substitute)
3. Rejection reasons (bulleted list)
4. Carbon impact statement
5. Health impact statement
6. Recommended action
7. Architect signature block
8. Attachments list

## Usage Examples

### Backend Service Integration

```javascript
const defensibilityService = require('./services/azure/defensibilityService');

// Check a single product
const result = defensibilityService.performDefensibilityCheck(
  documentContent,
  'Product Name',
  'Manufacturer'
);

console.log(`Defensibility Score: ${result.defensibilityScore}/100`);
console.log(`Is Defensible: ${result.isDefensible}`);

// Compare products
const originalData = { ... };
const substituteData = { ... };

const comparison = await defensibilityService.performOrEqualComparison(
  originalData,
  substituteData,
  { projectName: 'My Project', architect: 'John Doe, AIA' }
);

if (comparison.verdict === 'Reject') {
  console.log('Rejection Memo:', comparison.rejectionMemo);
}
```

### TypeScript Agent

```typescript
import {
  performDefensibilityCheck,
  compareProducts,
  generateRejectionMemo
} from '@/lib/agents/defensibility-agent';

// Check defensibility
const result = performDefensibilityCheck(
  documentContent,
  productName,
  manufacturer
);

// Compare products
const comparison = compareProducts(originalProduct, substituteProduct);

if (comparison.overallVerdict === 'Reject') {
  const memo = generateRejectionMemo(comparison, projectContext);
  // Display or email memo to architect
}
```

## Testing

### Manual Testing

```bash
cd /home/runner/work/green-sourcing-b2b-app/green-sourcing-b2b-app

# Run defensibility test suite
node backend/tests/manual/test-defensibility.js
```

**Test Coverage:**
- ✅ Fully certified product (80/100 score)
- ✅ Uncertified product (0/100 score)
- ✅ "Or Equal" comparison with worse substitute (Reject)
- ✅ "Or Equal" comparison with acceptable substitute (Accept)
- ✅ Rejection memo generation

## Performance

- **Certificate Extraction**: ~50ms
- **Metric Extraction**: ~30ms
- **Defensibility Check**: ~80ms
- **Product Comparison**: ~100ms
- **AI Enhancement**: ~1-2 seconds (optional)
- **Total Pipeline**: 2-5 seconds (with Document Intelligence)

## Security & Compliance

- **Role-Based Access**: Only Admins and Buyers can compare products
- **No Data Storage**: Comparison results not persisted (stateless)
- **Audit Trails**: All comparisons logged via Azure Application Insights
- **PII Protection**: No personal data in memos except architect name (provided by user)

## Future Enhancements

1. **Database Integration**: Store rejection memos for project history
2. **Email Integration**: Auto-send rejection memos to architects
3. **PDF Generation**: Export rejection memos as formatted PDFs
4. **Batch Comparison**: Compare multiple substitutes at once
5. **Historical Analysis**: Track substitution attempt patterns
6. **Custom Thresholds**: Allow projects to set custom acceptance criteria

## Files

- **Types**: `lib/types/defensibility.ts`
- **Agent**: `lib/agents/defensibility-agent.ts`
- **Service**: `backend/services/azure/defensibilityService.js`
- **Routes**: `backend/routes/documentAI.js` (endpoints added)
- **Tests**: `backend/tests/manual/test-defensibility.js`

## Support

For issues or questions about the Defensibility Agent, create an issue in the repository or contact the development team.

---

**Protection Level**: 🛡️ **HIGH** - Anti-Value Engineering shields active

**Certification Requirements**: CDPH v1.2 + Verified EPD

**Carbon Tolerance**: ≤ 10% increase

**Health Tolerance**: Zero degradation
