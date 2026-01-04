# Commander: Locked File Management

This document tracks all locked file change requests from agents. The commander applies these changes in a single commit at the end of each sprint to avoid merge conflicts.

## Locked Files

| File | Status | Lock Reason |
|------|--------|-------------|
| `app/layout.tsx` | 🔒 LOCKED | Single root layout, easy conflicts |
| `app/globals.css` | 🔒 LOCKED | Styles cascade conflicts |
| `backend/index.js` | 🔒 LOCKED | Route registration order |
| `package.json` | 🔒 LOCKED | Dependency conflicts |
| `package-lock.json` | 🔒 LOCKED | Lockfile churn |
| `backend/db.js` | 🔒 LOCKED | Pool singleton |

---

## Pending Change Requests

### backend/index.js

**Request 1: BACKEND-CATALOG**
```javascript
// Add after: app.use('/api/v1/scoring', scoringRoutes);
const catalogRoutes = require('./routes/catalog');
app.use('/api/v1/catalog', catalogRoutes);
```

**Request 2: BACKEND-PAYMENTS**
```javascript
// Add after catalog routes
const paymentsRoutes = require('./routes/payments');
app.use('/api/v1/payments', paymentsRoutes);

// Add Stripe webhook (BEFORE express.json() middleware for raw body)
// This should be early in the middleware chain
const stripeWebhookRoutes = require('./routes/webhooks/stripe');
// Note: Stripe webhooks need raw body, handle in route file
```

**Request 3: BACKEND-PAYMENTS (Webhook raw body)**
```javascript
// Add near the top, before express.json():
// Stripe webhook needs raw body - mount before JSON parser
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }), require('./routes/webhooks/stripe'));
```

---

### package.json

**Request 1: BACKEND-PAYMENTS**
```json
{
  "dependencies": {
    "stripe": "^14.0.0"
  }
}
```

---

### app/globals.css

**Request 1: UI-CATALOG**
```css
/* Catalog Layout */
.gc-catalog-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
  max-width: 1440px;
  margin: 0 auto;
  padding: 24px;
}

@media (max-width: 768px) {
  .gc-catalog-layout {
    grid-template-columns: 1fr;
  }
  .gc-catalog-sidebar {
    position: fixed;
    left: -100%;
    transition: left 0.3s ease;
  }
  .gc-catalog-sidebar.open {
    left: 0;
  }
}

/* Catalog Grid */
.gc-catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

/* Material Card */
.gc-material-card {
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.gc-material-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.gc-material-card-image {
  height: 180px;
  background: linear-gradient(135deg, var(--gc-emerald-50), var(--gc-teal-50));
  display: flex;
  align-items: center;
  justify-content: center;
}

.gc-material-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gc-material-card-content {
  padding: 16px;
  flex: 1;
}

.gc-material-card-content h3 {
  font-size: 16px;
  font-weight: 700;
  color: var(--gc-slate-900);
  margin-bottom: 4px;
  line-height: 1.3;
}

.gc-material-card .gc-type {
  font-size: 12px;
  color: var(--gc-slate-500);
  margin-bottom: 8px;
}

/* Score Badge */
.gc-score-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
}

.gc-score-badge[data-score="high"] {
  background: linear-gradient(135deg, var(--gc-emerald-100), var(--gc-teal-100));
  color: var(--gc-emerald-700);
}

.gc-score-badge[data-score="medium"] {
  background: var(--gc-amber-100);
  color: var(--gc-amber-700);
}

.gc-score-badge[data-score="low"] {
  background: var(--gc-slate-100);
  color: var(--gc-slate-600);
}

/* Certification Chips */
.gc-cert-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 8px 0;
}

.gc-cert-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}

.gc-cert-badge[data-type="FSC"] {
  background: #e8f5e9;
  color: #2e7d32;
}

.gc-cert-badge[data-type="EPD"] {
  background: #e3f2fd;
  color: #1565c0;
}

.gc-cert-badge[data-type="LEED"] {
  background: #f3e5f5;
  color: #7b1fa2;
}

/* Compare Tray */
.gc-compare-tray {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--gc-slate-200);
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  z-index: 100;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.1);
}

.gc-compare-tray-items {
  display: flex;
  gap: 8px;
  flex: 1;
}

.gc-compare-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--gc-slate-100);
  border-radius: 8px;
  font-size: 14px;
}

.gc-compare-tray-actions {
  display: flex;
  gap: 8px;
}

/* Filter Sidebar */
.gc-filter-sidebar {
  padding: 16px;
  background: var(--gc-white);
  border-radius: 12px;
  border: 1px solid var(--gc-slate-200);
  position: sticky;
  top: 88px;
}

.gc-filter-section {
  margin-bottom: 20px;
}

.gc-filter-section > label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--gc-slate-500);
  margin-bottom: 8px;
}

.gc-checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 14px;
  cursor: pointer;
}

.gc-slider {
  width: 100%;
  accent-color: var(--gc-emerald-600);
}

/* Material Detail */
.gc-material-detail {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.gc-material-hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  margin-bottom: 48px;
}

@media (max-width: 768px) {
  .gc-material-hero {
    grid-template-columns: 1fr;
  }
}

.gc-material-images {
  border-radius: 16px;
  overflow: hidden;
  background: var(--gc-slate-100);
  aspect-ratio: 4/3;
}

.gc-material-images img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gc-material-info h1 {
  font-size: clamp(24px, 4vw, 36px);
  font-weight: 800;
  color: var(--gc-slate-900);
  margin-bottom: 8px;
}

.gc-sustainability-section,
.gc-suppliers-section {
  margin-bottom: 48px;
}

.gc-sustainability-section h2,
.gc-suppliers-section h2 {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 16px;
  color: var(--gc-slate-900);
}

.gc-suppliers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.gc-supplier-card {
  padding: 16px;
  border: 1px solid var(--gc-slate-200);
  border-radius: 12px;
  background: var(--gc-white);
}

.gc-supplier-card h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.gc-tier-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  background: var(--gc-emerald-100);
  color: var(--gc-emerald-700);
}

.gc-shadow-suppliers-note {
  margin-top: 16px;
  padding: 12px 16px;
  background: var(--gc-slate-50);
  border-radius: 8px;
  font-size: 14px;
  color: var(--gc-slate-600);
}

/* Sustainability Scorecard */
.gc-sustainability-card {
  padding: 24px;
  border: 1px solid var(--gc-slate-200);
  border-radius: 16px;
  background: var(--gc-white);
}

.gc-score-breakdown {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.gc-score-item {
  text-align: center;
}

.gc-score-bar {
  height: 8px;
  background: var(--gc-slate-100);
  border-radius: 4px;
  overflow: hidden;
  margin-top: 8px;
}

.gc-score-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--gc-emerald-500), var(--gc-teal-500));
  border-radius: 4px;
}
```

---

## Applying Changes (Commander Workflow)

### Step 1: Verify All Agent PRs Merged
Ensure all agent branches are merged before applying locked file changes.

### Step 2: Apply Changes in Order

```bash
# 1. Install new dependencies
npm install stripe@^14.0.0

# 2. Update backend/index.js with all route registrations
# (manually apply the changes above)

# 3. Append catalog styles to app/globals.css
# (manually apply the changes above)

# 4. Commit all locked file changes together
git add backend/index.js package.json package-lock.json app/globals.css
git commit -m "feat: apply locked file changes from agent sprint

- Add Stripe dependency
- Register catalog, payments, webhook routes
- Add catalog and material card styles"
```

### Step 3: Run Full Test Suite
```bash
npm run lint
npm run test
npm run build
```

---

## Change Request Template

Agents should submit change requests in this format:

```json
{
  "agent": "AGENT_NAME",
  "file": "path/to/locked/file",
  "change": "Brief description of change",
  "code": "// Exact code to add",
  "position": "after: <existing line> | before: <existing line> | replace: <existing line>",
  "priority": "required | nice-to-have"
}
```

---

*Last Updated: 2026-01-04*
