# LOCKED FILE CHANGE REQUEST

## Agent: BACKEND-CATALOG
## Date: 2026-01-04
## Status: PENDING REVIEW

---

## File to Modify
`backend/index.js`

## Reason
The new Catalog API routes need to be registered in the main Express application to expose the `/api/v1/catalog/*` endpoints.

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
+    // Catalog API - material search and comparison
+    app.use('/api/v1/catalog', catalogRoutes);
 
     // Integration APIs
     // Revit Integration - Azure Entra ID auth, project/material sync
```

## New Endpoints Exposed

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/catalog/materials` | Search materials with filters |
| GET | `/api/v1/catalog/materials/:id` | Get material details with suppliers |
| GET | `/api/v1/catalog/materials/:id/score` | Get sustainability breakdown |
| GET | `/api/v1/catalog/categories` | Get category tree |
| GET | `/api/v1/catalog/certifications` | Get available certifications |
| POST | `/api/v1/catalog/compare` | Compare 2-5 materials |
| POST | `/api/v1/catalog/materials/:id/favorite` | Add to favorites (auth required) |
| DELETE | `/api/v1/catalog/materials/:id/favorite` | Remove from favorites (auth required) |
| GET | `/api/v1/catalog/health` | Health check |

## Dependencies
- `backend/routes/catalog.js` (created)
- `backend/services/catalog/search.js` (created)
- `backend/services/catalog/scoring.js` (created)
- `backend/services/catalog/index.js` (created)

## Testing Notes
After applying this change, test with:
```bash
# Health check
curl http://localhost:3001/api/v1/catalog/health

# Search materials
curl "http://localhost:3001/api/v1/catalog/materials?q=wood&limit=10"

# Get categories
curl http://localhost:3001/api/v1/catalog/categories
```

---

**Approved by:** _________________
**Date Applied:** _________________
