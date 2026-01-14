# Decision Logic Extraction Agent

## Overview

The Decision Logic Extraction Agent enhances the Azure Document Intelligence PDF parsing pipeline by extracting material-specific decision criteria for different stakeholder roles. This helps identify products that go beyond generic "Eco-friendly" tags and extracts **hard metrics** that specific roles need to sign off on a purchase.

## Business Value

Products that claim to be "Sustainable" but lack the required data points for their category are flagged as "Low Relevance" in the search index. This ensures buyers find products with the actual decision criteria they need, not just marketing buzzwords.

## Architecture

### Components

1. **TypeScript Types** (`lib/types/decision-logic.ts`)
   - Type-safe interfaces for decision criteria
   - Material category definitions
   - Relevance scoring types

2. **TypeScript Agent** (`lib/agents/decision-logic-extractor.ts`)
   - Client-side implementation for Next.js/React usage
   - Pure function-based extraction logic
   - Type-safe orchestration

3. **Backend Service** (`backend/services/azure/decisionLogicExtractor.js`)
   - Node.js/Express compatible CommonJS module
   - Regex-based pattern matching
   - Integrated with Document Intelligence pipeline

4. **API Endpoint** (`backend/routes/documentAI.js`)
   - `POST /api/v1/ai/extract-with-decision-logic`
   - Authenticated endpoint (Supplier/Admin roles)
   - Returns document content + decision logic analysis

## Material Categories

### 1. Flooring Materials

**Target Roles:** Facility Managers, Flooring Subcontractors

**Required Decision Criteria:**
- `No Stripping` - Does the product require stripping?
- `Polish only` - Can it be maintained with polish only?
- `Adhesive-free` - Is it a floating/click-lock installation?
- Cleaning protocol and maintenance cycle

**Example:**
```json
{
  "materialCategory": "Flooring",
  "targetRoles": ["Facility Manager", "Flooring Subcontractor"],
  "decisionCriteria": {
    "maintenanceRequirements": {
      "noStripping": true,
      "polishOnly": true,
      "adhesiveFree": true,
      "cleaningProtocol": "Damp mop with neutral cleaner",
      "maintenanceCycleMonths": 12
    }
  },
  "relevanceScore": "High",
  "missingCriteria": [],
  "validationNotes": "All key decision criteria present for Facility Manager, Flooring Subcontractor"
}
```

### 2. Insulation/Facade Materials

**Target Roles:** Insurance Risk Managers, Architects

**Required Decision Criteria:**
- `Non-combustible` - Fire safety classification
- `Mineral Wool` - Material composition
- `Fire Resistance` - Rating in minutes/hours
- Flame spread index and smoke developed index

**Example:**
```json
{
  "materialCategory": "Insulation",
  "targetRoles": ["Insurance Risk Manager", "Architect"],
  "decisionCriteria": {
    "fireResistanceData": {
      "nonCombustible": true,
      "mineralWool": true,
      "fireResistanceRating": "2 hours",
      "fireResistanceMinutes": 120,
      "flameSpreadIndex": 0,
      "smokeDevelopedIndex": 0
    }
  },
  "relevanceScore": "High"
}
```

### 3. Structural Materials (Drywall, etc.)

**Target Roles:** Drywall Subcontractors, General Contractors

**Required Decision Criteria:**
- `Lightweight` - Weight specification
- `Speed of install` - Installation efficiency
- Weight per square foot
- Special tools required

**Example:**
```json
{
  "materialCategory": "Structure",
  "targetRoles": ["Drywall Subcontractor", "General Contractor"],
  "decisionCriteria": {
    "installationData": {
      "lightweight": true,
      "speedOfInstall": true,
      "weightPerSqFt": 1.6,
      "specialToolsRequired": false
    }
  },
  "relevanceScore": "High"
}
```

## Usage

### Backend API

```javascript
// Using the API endpoint
const formData = new FormData();
formData.append('document', pdfFile);

const response = await fetch('/api/v1/ai/extract-with-decision-logic', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
console.log('Material Category:', result.decisionLogic.materialCategory);
console.log('Relevance Score:', result.decisionLogic.relevanceScore);
console.log('Target Roles:', result.decisionLogic.targetRoles);
```

### Backend Service Direct Usage

```javascript
const documentIntelligence = require('./services/azure/documentIntelligence');

// Extract document with decision logic
const result = await documentIntelligence.parseWithDecisionLogic(pdfBuffer);

// Access decision logic
const { materialCategory, relevanceScore, decisionCriteria } = result.decisionLogic;

if (relevanceScore === 'Low') {
  console.warn('Product lacks required decision criteria');
}
```

### TypeScript Agent Usage

```typescript
import { extractDecisionLogic } from '@/lib/agents/decision-logic-extractor';

// Extract from document content string
const documentContent = `...`; // Content from Azure Document Intelligence
const result = extractDecisionLogic(documentContent);

console.log('Material Category:', result.materialCategory);
console.log('Relevance Score:', result.relevanceScore);
console.log('Missing Criteria:', result.missingCriteria);
```

## Relevance Scoring

The system calculates a relevance score based on the presence of required criteria:

- **High (≥80%)**: Product has most/all required decision criteria
- **Medium (≥50%)**: Product has some required criteria
- **Low (<50%)**: Product lacks most decision criteria or category unknown

Products flagged as "Low Relevance" should be de-prioritized in search results.

## Regex Patterns

### Flooring Patterns
```javascript
noStripping: /no\s*strip(?:ping)?|strip[-]?free|never\s+strip/i
polishOnly: /polish\s*only|buff\s*only|no\s*wax|wax[-]?free/i
adhesiveFree: /adhesive[-]?free|click[-]?lock|floating(?:\s+floor)?|glue[-]?free/i
```

### Fire Resistance Patterns
```javascript
nonCombustible: /non[-]?combustible|incombustible|class\s*a(?:1|2)?|fire[-]?proof/i
mineralWool: /mineral\s*wool|rock\s*wool|stone\s*wool/i
fireResistance: /fire\s*resist(?:ance|ant)?[:\s]*(\d+)[-\s]*(?:min(?:ute)?s?|hour?s?)/i
```

### Installation Patterns
```javascript
lightweight: /light[-]?weight|reduced\s*weight|easy\s*to\s*(?:lift|carry|handle)/i
speedOfInstall: /(?:fast|quick|rapid|easy)\s*install(?:ation)?|time[-]?saving|reduced\s*labor/i
weightPerSqFt: /(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds?)?\s*(?:per|\/)\s*(?:sq\.?\s*ft|square\s*foot)/i
```

## Testing

### Manual Testing

```bash
cd /home/runner/work/green-sourcing-b2b-app/green-sourcing-b2b-app

# Test the backend service
node -e "
const extractor = require('./backend/services/azure/decisionLogicExtractor');

const testContent = \`
Premium Vinyl Plank Flooring
- No stripping required
- Polish only maintenance
- Click-lock installation
\`;

const result = extractor.extractDecisionLogic(testContent);
console.log(JSON.stringify(result, null, 2));
"
```

### Integration Testing

The decision logic extraction is automatically applied when using:
```javascript
documentIntelligence.parseWithDecisionLogic(source)
```

This combines standard Azure Document Intelligence extraction with decision logic analysis.

## Future Enhancements

1. **Machine Learning Enhancement**: Train ML model on validated examples
2. **Additional Categories**: Add HVAC, Electrical, Plumbing categories
3. **Custom Rules**: Allow organizations to define custom decision criteria
4. **Confidence Scoring**: Add confidence levels to extracted criteria
5. **Multi-language Support**: Extend pattern matching to other languages

## Files Modified/Created

- **Created**: `lib/types/decision-logic.ts` - TypeScript type definitions
- **Created**: `lib/agents/decision-logic-extractor.ts` - TypeScript agent
- **Created**: `backend/services/azure/decisionLogicExtractor.js` - Backend service
- **Modified**: `backend/services/azure/documentIntelligence.js` - Added parseWithDecisionLogic
- **Modified**: `backend/routes/documentAI.js` - Added API endpoint

## Dependencies

No new dependencies required! Uses existing:
- `@azure/ai-form-recognizer` (already installed)
- Node.js built-in regex
- TypeScript (dev dependency)

## Security Considerations

- API endpoint requires authentication (JWT token)
- Role-based access control (Supplier/Admin only)
- No PII or sensitive data stored
- Regex patterns are non-destructive read-only operations

## Performance

- **Pattern Matching**: O(n) where n = document length
- **Typical Processing Time**: <100ms for decision logic extraction
- **Document Intelligence**: 2-5 seconds (Azure service)
- **Total Pipeline**: ~2-5 seconds including decision logic

## Support

For issues or questions, contact the development team or create an issue in the GitHub repository.
