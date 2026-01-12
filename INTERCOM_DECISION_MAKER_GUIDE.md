# Enhanced Intercom Integration - Implementation Guide

## Overview

This implementation enhances the Intercom chat widget with Decision Maker data and enables role-based contextual conversations between architects and suppliers.

## Features Implemented

### 1. Enhanced Intercom Boot with Decision Maker Data

The Intercom widget now receives strategic custom attributes that help the support team and Fin AI agent understand user context immediately.

#### Data Passed to Intercom:
- `user_hash` - Identity verification hash (for security)
- `role_layer` - Decision maker layer (e.g., "Financial Gatekeeper", "Design Lead")
- `decision_metric` - Primary motivation (e.g., "ROI/NPV", "Aesthetics")
- `sustainability_priority` - Priority level (e.g., "Data-driven", "Brand-led")
- `active_rfqs` - Number of active RFQs
- `user_role` - User role (Buyer, Supplier, etc.)
- `subscription_tier` - Supplier tier (Free, Premium, Enterprise)
- `job_title` - Job title for persona mapping

### 2. Supplier-to-Architect Conversation Starter

The `AskSupplierButton` component enables contextual product inquiries with:
- Role-specific data requests based on Decision Maker layer
- Automatic routing based on supplier tier
- Pre-filled contextual messages
- Analytics tracking

## Database Migration

### Required Migration

Run the migration to add Decision Maker attributes to the Users table:

```bash
psql -U user -d greenchainz_dev < database-schemas/migrations/20260111_230000_add_decision_maker_attributes.sql
```

This adds the following columns to the Users table:
- `DecisionLayer` VARCHAR(100)
- `PrimaryMotivation` VARCHAR(100)
- `PriorityLevel` VARCHAR(100)
- `JobTitle` VARCHAR(100)
- `RFQCount` INTEGER DEFAULT 0

## API Endpoints

### GET /api/v1/auth/me (Enhanced)

Returns user data including Decision Maker attributes.

**Response:**
```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
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

### GET /api/v1/intercom/identity-hash (Existing)

Returns Intercom identity verification hash.

**Response:**
```json
{
  "userHash": "abc123...",
  "appId": "cqtm1euj"
}
```

### POST /api/v1/intercom/route-conversation (New)

Routes conversations based on supplier tier.

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
  "supplierTier": "premium",
  "message": "Conversation will be routed to supplier team"
}
```

**Routing Logic:**
- Premium/Enterprise/Pro tiers → Direct to supplier team inbox
- Free/Standard tiers → Route to Concierge Agent

## Frontend Components

### IntercomWidget Component

Enhanced to accept Decision Maker attributes.

**Usage:**
```tsx
import IntercomWidget from '@/app/components/IntercomWidget'

<IntercomWidget 
  user={{
    id: 'user-123',
    email: 'user@example.com',
    role: 'Buyer',
    layer: 'Financial Gatekeeper',
    primaryMotivation: 'ROI/NPV',
    // ... other attributes
  }}
  userHash="identity-hash"
/>
```

### AskSupplierButton Component

Opens Intercom with role-specific pre-filled message.

**Usage:**
```tsx
import AskSupplierButton from '@/app/components/AskSupplierButton'

<AskSupplierButton
  productId="product-uuid"
  productName="Sustainable Bamboo Flooring"
  supplierName="EcoFloor Solutions"
  supplierId="supplier-uuid"
  supplierTier="premium"
  userRole="Buyer"
  userLayer="Design Lead"
/>
```

**Role-Specific Data Requests:**

| Decision Layer | Data Request |
|----------------|--------------|
| Financial Gatekeeper / Quantity Surveyor | Pricing breakdown and ROI data |
| Design Lead / Architect | Color samples, texture options, aesthetic specs |
| Sustainability Officer | EPD documentation and carbon footprint data |
| Procurement / Project Manager | Lead times, MOQ, delivery logistics |
| Technical / Engineer | Technical specs and compliance certifications |

### useAuth Hook (Enhanced)

Returns user data with Decision Maker attributes and Intercom identity.

**Usage:**
```tsx
import { useAuth } from '@/app/hooks/useAuth'

const { user, intercomIdentity, loading } = useAuth()

// user.layer - Decision Maker layer
// user.primaryMotivation - Primary motivation
// user.priorityLevel - Priority level
// user.jobTitle - Job title
// user.rfqCount - Active RFQs count
// user.tier - Supplier tier
// intercomIdentity.userHash - Identity hash
```

## Testing

### Test Decision Maker Data in Intercom

1. Log in as a user with Decision Maker attributes
2. Open Intercom chat widget
3. Support team should see custom attributes in user profile:
   - Role Layer
   - Decision Metric
   - Sustainability Priority
   - Active RFQs
   - User Role
   - Subscription Tier

### Test AskSupplierButton

1. Visit a product page with AskSupplierButton
2. Click "Ask Supplier"
3. Verify:
   - Intercom opens with pre-filled message
   - Message contains role-specific data request
   - Routing note shows correct tier-based routing
   - Analytics event is tracked

## Environment Variables

Required environment variables:

```env
# Frontend
NEXT_PUBLIC_INTERCOM_APP_ID=your-intercom-app-id
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001

# Backend
INTERCOM_SECRET_KEY=your-intercom-secret-key
INTERCOM_APP_ID=your-intercom-app-id
INTERCOM_CONCIERGE_ADMIN_ID=concierge-admin-id (optional)
INTERCOM_CONCIERGE_TEAM_ID=concierge-team-id (optional)
```

## Example Product Page

An example implementation is available in:
`app/components/ExampleProductPage.tsx`

This demonstrates:
- Product display with supplier information
- User context display (shows Decision Maker attributes)
- AskSupplierButton integration
- Example messages by role

## Populating Decision Maker Data

Decision Maker attributes should be populated when:

1. **User Onboarding**: Collect job title and role during signup
2. **Profile Settings**: Allow users to update their decision layer and priorities
3. **AI Inference**: Use job title to infer decision layer using the persona mapping in `lib/types/intercom-persona.ts`
4. **RFQ Activity**: Update `rfqCount` when users create/close RFQs

### Example Update Query:

```sql
UPDATE Users 
SET 
  DecisionLayer = 'Financial Gatekeeper',
  PrimaryMotivation = 'ROI/NPV',
  PriorityLevel = 'Data-driven',
  JobTitle = 'Quantity Surveyor'
WHERE UserID = $1;
```

## Security Considerations

1. **Identity Verification**: The `user_hash` parameter ensures secure user identification
2. **Authentication Required**: All endpoints use JWT authentication
3. **Rate Limiting**: Consider adding rate limits to `/route-conversation` endpoint
4. **Data Privacy**: Decision Maker data is only shared with Intercom for support purposes

## Future Enhancements

Potential improvements:
1. Integrate Intercom API to actually route conversations (currently logs routing decision)
2. Add webhook handler to capture conversation responses
3. Implement supplier notification system for premium tier inquiries
4. Add analytics dashboard for conversation metrics
5. Support multi-language role-specific messages
6. Implement conversation templates library

## Troubleshooting

### Intercom not loading Decision Maker data

1. Check that user is authenticated (token in localStorage)
2. Verify `/api/v1/auth/me` returns Decision Maker attributes
3. Check browser console for errors
4. Verify INTERCOM_APP_ID is configured

### AskSupplierButton not opening Intercom

1. Verify Intercom widget is loaded (check window.Intercom exists)
2. Check browser console for errors
3. Verify user has valid authentication token
4. Check that Intercom script is loaded in LayoutContent

### Route-conversation endpoint errors

1. Verify database connection
2. Check that Supplier_Tiers and related tables exist
3. Verify JWT token is valid
4. Check backend logs for SQL errors

## Support

For issues or questions:
1. Check browser console logs (look for `[Intercom]` or `[AskSupplier]` prefixes)
2. Check backend logs (look for `[Intercom Routes]` prefixes)
3. Verify database schema matches migration
4. Review Intercom dashboard for user data
