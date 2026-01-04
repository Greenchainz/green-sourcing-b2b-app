# LOCKED FILE CHANGE REQUEST

## Agent: BACKEND-CATALOG
## Date: 2026-01-04
## Status: PENDING REVIEW

---

## File to Modify
`backend/index.js`

## Reason
The Catalog API routes need to be registered in the main Express application to expose the `/api/v1/catalog/*` endpoints for material search, filtering, comparison, and sustainability scoring.

## Required Change

### Add Import (Line ~19, after other route imports)
```javascript
const catalogRoutes = require('./routes/catalog');
```

### Add Route Registration (Line ~157, with other API routes)
```javascript
app.use('/api/v1/catalog', catalogRoutes);
```

## Full Context Diff

```diff
--- backend/index.js
+++ backend/index.js
@@ -17,6 +17,7 @@ const shadowSupplierRoutes = require('./routes/shadow-suppliers');
 const aiGatewayRoutes = require('./routes/ai-gateway');
 const buyerVerificationRoutes = require('./routes/buyerVerification');
+const catalogRoutes = require('./routes/catalog');
 
 // AI Gateway
 const aiGateway = require('./services/ai-gateway');
@@ -155,6 +156,9 @@ async function start() {
     aiGateway.initialize().catch(err => {
         console.warn('⚠️  AI Gateway initialization warning:', err.message);
     });
     app.use('/api/v1/scoring', scoringRoutes);
+    
+    // Catalog API - material search, comparison, and sustainability scoring
+    app.use('/api/v1/catalog', catalogRoutes);
 
     // Integration APIs
     // Revit Integration - Azure Entra ID auth, project/material sync
```

## New Endpoints Exposed

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/catalog/materials` | Search materials with filters, pagination, and facets |
| GET | `/api/v1/catalog/materials/:id` | Get material details (shadow suppliers anonymized) |
| GET | `/api/v1/catalog/materials/:id/score` | Get sustainability breakdown with explanations |
| GET | `/api/v1/catalog/categories` | Get category tree with material counts |
| GET | `/api/v1/catalog/certifications` | Get available certifications for filtering |
| POST | `/api/v1/catalog/compare` | Compare 2-5 materials side-by-side |
| POST | `/api/v1/catalog/materials/:id/favorite` | Add to favorites (auth required) |
| DELETE | `/api/v1/catalog/materials/:id/favorite` | Remove from favorites (auth required) |
| GET | `/api/v1/catalog/health` | Health check |

## Features Implemented

### Search with Full-Text Search
- PostgreSQL `to_tsquery()` with weighted fields (product name A, description B, category C, supplier D)
- Prefix matching for autocomplete-style search
- Category, certification, and minimum score filters
- Sort options: relevance, score, price_asc, price_desc, newest, name

### Facets for UI Filtering
- Category facets with material counts
- Certification facets with supplier counts
- Score range facets (excellent, good, average, below_average)

### Shadow Supplier Anonymization
- Unclaimed shadow suppliers are anonymized in public responses
- Supplier identity revealed only after RFQ submission
- Maintains sustainability data visibility while protecting supplier identity

### Sustainability Scoring Breakdown
- Explainable scores with "why is this sustainable?" factors
- Component breakdown: certifications (35%), carbon (25%), transparency (20%), LEED (20%)
- Certification tiers: gold, silver, bronze, basic
- GWP thresholds for carbon scoring

## Dependencies
- `backend/routes/catalog.js`
- `backend/services/catalog/search.js`
- `backend/services/catalog/scoring.js`
- `backend/services/catalog/index.js`
- `backend/services/shadow/visibility.js` (optional, for anonymization)

## Testing Notes
After applying this change, test with:
```bash
# Health check
curl http://localhost:3001/api/v1/catalog/health

# Search materials with facets
curl "http://localhost:3001/api/v1/catalog/materials?q=wood&limit=10"

# Get categories
curl http://localhost:3001/api/v1/catalog/categories

# Get certifications for filter dropdown
curl http://localhost:3001/api/v1/catalog/certifications

# Get material detail with anonymized shadow supplier
curl http://localhost:3001/api/v1/catalog/materials/1

# Get sustainability breakdown
curl http://localhost:3001/api/v1/catalog/materials/1/score

# Compare materials
curl -X POST http://localhost:3001/api/v1/catalog/compare \
  -H "Content-Type: application/json" \
  -d '{"materialIds": [1, 2, 3]}'
```

---

**Approved by:** _________________
**Date Applied:** _________________
