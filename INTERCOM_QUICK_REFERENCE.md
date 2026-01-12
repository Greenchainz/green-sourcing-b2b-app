# Intercom Decision Maker Integration - Quick Reference

## 🚀 Quick Start

### 1. Apply Database Migration
```bash
psql -U user -d greenchainz_dev < database-schemas/migrations/20260111_230000_add_decision_maker_attributes.sql
```

### 2. Use AskSupplierButton in Product Pages
```tsx
import AskSupplierButton from '@/app/components/AskSupplierButton'
import { useAuth } from '@/app/hooks/useAuth'

export default function ProductPage() {
  const { user } = useAuth()
  
  return (
    <AskSupplierButton
      productId="product-uuid"
      productName="Sustainable Bamboo Flooring"
      supplierName="EcoFloor Solutions"
      supplierId="supplier-uuid"
      supplierTier="premium"
      userRole={user?.role}
      userLayer={user?.layer}
    />
  )
}
```

### 3. Populate Decision Maker Data
```sql
UPDATE Users 
SET 
  DecisionLayer = 'Financial Gatekeeper',
  PrimaryMotivation = 'ROI/NPV',
  PriorityLevel = 'Data-driven',
  JobTitle = 'Quantity Surveyor',
  RFQCount = 3
WHERE UserID = $1;
```

## 📋 Decision Maker Attributes

| Column | Type | Example | Description |
|--------|------|---------|-------------|
| `DecisionLayer` | VARCHAR(100) | "Financial Gatekeeper" | User's decision-making layer |
| `PrimaryMotivation` | VARCHAR(100) | "ROI/NPV" | Key motivation metric |
| `PriorityLevel` | VARCHAR(100) | "Data-driven" | Sustainability approach |
| `JobTitle` | VARCHAR(100) | "Quantity Surveyor" | Job title |
| `RFQCount` | INTEGER | 3 | Number of active RFQs |

## 🎯 Role Mapping

### Decision Layers
- **Financial Gatekeeper** - Focus on ROI and cost
- **Design Lead** - Focus on aesthetics and specifications
- **Sustainability Officer** - Focus on carbon data and EPDs
- **Procurement Manager** - Focus on logistics and MOQ
- **Technical Engineer** - Focus on specs and compliance

### Data Requests by Role
```javascript
getRoleSpecificDataRequest(userLayer)
```

| Layer | Returns |
|-------|---------|
| Financial/Quantity Surveyor | "pricing breakdown and ROI data" |
| Design/Architect | "color samples, texture options, aesthetic specs" |
| Sustainability | "EPD documentation and carbon footprint data" |
| Procurement/Project Manager | "lead times, MOQ, delivery logistics" |
| Technical/Engineer | "technical specs and compliance certifications" |

## 🔄 API Endpoints

### GET /api/v1/auth/me
Returns user with Decision Maker attributes.

**Response:**
```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "role": "Buyer",
    "layer": "Financial Gatekeeper",
    "primaryMotivation": "ROI/NPV",
    "priorityLevel": "Data-driven",
    "jobTitle": "Quantity Surveyor",
    "rfqCount": 3,
    "tier": "premium"
  }
}
```

### GET /api/v1/intercom/identity-hash
Returns Intercom identity verification hash.

**Response:**
```json
{
  "userHash": "abc123...",
  "appId": "cqtm1euj"
}
```

### POST /api/v1/intercom/route-conversation
Routes conversation based on supplier tier.

**Request:**
```json
{
  "supplierId": "supplier-uuid",
  "message": "Pre-filled message",
  "productId": "product-uuid",
  "productName": "Product Name"
}
```

**Response:**
```json
{
  "success": true,
  "routedTo": "supplier",
  "supplierTier": "premium"
}
```

## 🏷️ Supplier Tiers

### Tier Levels
```typescript
import { isPremiumTier } from '@/lib/utils/supplierTier'

isPremiumTier('premium')    // true - Direct routing
isPremiumTier('enterprise') // true - Direct routing
isPremiumTier('pro')        // true - Direct routing
isPremiumTier('free')       // false - Concierge routing
isPremiumTier('standard')   // false - Concierge routing
```

### Routing Logic
```
Premium/Enterprise/Pro → Direct to Supplier Team
Free/Standard         → Route to Concierge Agent
```

## 🔧 Intercom Widget

The widget is automatically integrated in `LayoutContent.tsx`:

```tsx
import { useAuth } from '@/app/hooks/useAuth'
import IntercomWidget from '@/app/components/IntercomWidget'

export function LayoutContent({ children }) {
  const { user, intercomIdentity, loading } = useAuth()
  
  return (
    <>
      {!loading && (
        <IntercomWidget 
          user={user || undefined} 
          userHash={intercomIdentity?.userHash}
        />
      )}
      {children}
    </>
  )
}
```

## 🎨 Intercom Custom Attributes

Data passed to Intercom boot:

```javascript
Intercom({
  app_id: 'cqtm1euj',
  user_id: user.id,
  user_hash: userHash,              // ← Identity verification
  role_layer: user.layer,           // ← Decision Maker layer
  decision_metric: user.primaryMotivation,
  sustainability_priority: user.priorityLevel,
  active_rfqs: user.rfqCount,
  user_role: user.role,
  subscription_tier: user.tier,
  job_title: user.jobTitle
})
```

## 🐛 Troubleshooting

### Intercom not showing Decision Maker data
1. Check user is authenticated (token in localStorage)
2. Verify `/api/v1/auth/me` returns attributes
3. Check browser console for errors
4. Verify columns exist in database

### AskSupplierButton not working
1. Verify Intercom widget is loaded
2. Check `window.Intercom` exists in console
3. Verify authentication token is valid
4. Check network tab for API errors

### Route-conversation errors
1. Verify database connection
2. Check Supplier_Tiers tables exist
3. Verify JWT token is valid
4. Check backend logs

## 📊 Testing

### Test Intercom Boot
```javascript
// Open browser console
window.Intercom('getVisitorId') // Should return user ID
window.Intercom('update')       // Refresh Intercom data
```

### Test Role-Specific Requests
```javascript
import { getRoleSpecificDataRequest } from '@/app/components/AskSupplierButton'

console.log(getRoleSpecificDataRequest('Financial Gatekeeper'))
// "pricing breakdown and ROI data"
```

### Test Tier Routing
```typescript
import { isPremiumTier } from '@/lib/utils/supplierTier'

console.log(isPremiumTier('premium'))    // true
console.log(isPremiumTier('free'))       // false
```

## 🔐 Security Checklist

- [x] JWT authentication on all endpoints
- [x] Identity hash (HMAC SHA256) for Intercom
- [x] SSR-safe localStorage access
- [x] No sensitive data in client code
- [x] GDPR-compliant with Ketch consent

## 📚 Documentation Files

- `INTERCOM_DECISION_MAKER_GUIDE.md` - Complete implementation guide
- `INTERCOM_VISUAL_SUMMARY.md` - Visual guide with diagrams
- `INTERCOM_QUICK_REFERENCE.md` - This file (quick reference)

## 🎯 Example Implementation

See `app/components/ExampleProductPage.tsx` for a complete working example.

---

**Need help?** Check the full guides or review the example implementation.
