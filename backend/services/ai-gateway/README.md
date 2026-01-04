# AI Agent Gateway

Central hub for routing calls to Azure AI Foundry agents/workflows with tier-based entitlements, quota management, caching, and audit logging.

## Features

### 🚀 Core Capabilities

- **Workflow Routing**: Route calls to Azure Foundry agents by name/version
- **Tier Entitlements**: Enforce access based on user subscription tier (Free, Pro, Enterprise, Admin)
- **Usage Quotas**: Track and limit API calls and token usage per billing period
- **Call Logging**: Audit trail with redacted inputs for compliance/GDPR
- **Smart Caching**: Cache safe workflow results (compliance, alternatives) for performance
- **Intercom Integration**: AI-generated draft messages with gated sending

### 🔐 Security & Compliance

- Input redaction (emails, phone numbers, API keys, passwords)
- All calls logged with SHA256 hashes for deduplication
- Opt-out registry for AI-generated messages
- Legal Guardian approval workflow for premium messaging

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AI Gateway Routes                        │
│                   /api/v1/ai-gateway/*                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Agent Gateway Core                        │
│  - Workflow validation                                       │
│  - Tier/entitlement checking                                │
│  - Quota enforcement                                         │
│  - Cache lookup                                              │
│  - Azure AI Foundry calls                                    │
│  - Response processing                                       │
└─────────────────────────────────────────────────────────────┘
          │              │              │              │
          ▼              ▼              ▼              ▼
   ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
   │Entitlements│  │ Call      │  │ Workflow  │  │ Intercom  │
   │ & Quotas   │  │ Logger    │  │ Cache     │  │ Sender    │
   └───────────┘  └───────────┘  └───────────┘  └───────────┘
          │              │              │              │
          └──────────────┴──────────────┴──────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │   PostgreSQL DB   │
                    │   Redis Cache     │
                    └───────────────────┘
```

## Tier System

| Tier       | AI Access | Calls/Month | Tokens/Month | Intercom Drafts |
|------------|-----------|-------------|--------------|-----------------|
| Free       | ✅        | 50          | 50,000       | ❌              |
| Pro        | ✅        | 500         | 500,000      | ❌              |
| Enterprise | ✅        | 5,000       | 5,000,000    | ✅ (with approval) |
| Admin      | ✅        | Unlimited   | Unlimited    | ✅              |

## Available Workflows

### Core Workflows (Auto-seeded)

| Workflow | Type | Cacheable | Min Tier | Description |
|----------|------|-----------|----------|-------------|
| `material-alternative` | alternatives | ✅ | Free | Suggest sustainable alternatives with certifications and carbon comparison |
| `carbon-estimator` | carbon | ✅ | Free | Estimate project carbon footprint using EC3 methodology |
| `compliance-check` | compliance | ✅ | Standard (pro) | Verify certification validity and LEED/BREEAM compliance |
| `rfq-scorer` | rfq_assist | ❌ | Standard (pro) | Score and rank RFQ supplier matches |
| `outreach-draft` | outreach | ❌ | Premium (enterprise) | Draft personalized Intercom outreach messages |

### Legacy/Additional Workflows

| Workflow | Type | Cacheable | Min Tier | Description |
|----------|------|-----------|----------|-------------|
| `compliance-checker` | compliance | ✅ | free | Check LEED/BREEAM/WELL compliance |
| `alternative-finder` | alternatives | ✅ | free | Find sustainable alternatives |
| `carbon-calculator` | carbon | ✅ | free | Calculate embodied carbon |
| `certification-analyzer` | certifications | ❌ | pro | Analyze certification documents |
| `rfq-assistant` | rfq_assist | ❌ | pro | AI-assisted RFQ generation |
| `document-analyzer` | document_analysis | ❌ | pro | Extract data from EPDs/specs |
| `supplier-outreach` | custom | ❌ | enterprise | Generate outreach messages |
| `market-insights` | custom | ✅ | enterprise | Market trends analysis |

### Tier Mapping
- **Free** = Free tier (basic access)
- **Standard** = Pro tier (professional features)
- **Premium** = Enterprise tier (full access)

## API Endpoints

### Material Alternatives (Free Tier)

```http
POST /api/v1/ai-gateway/material-alternatives
Authorization: Bearer <token>

{
  "materialId": "12345",           // optional - lookup from catalog
  "materialName": "Portland Cement",
  "category": "Concrete & Cement",
  "specifications": { ... },       // optional
  "projectRequirements": {         // optional
    "strength": "40 MPa",
    "leedTarget": "Gold"
  },
  "region": "US-West",
  "quantity": "500 tons"
}
```

Response:
```json
{
  "success": true,
  "originalMaterial": {
    "id": "12345",
    "name": "Portland Cement",
    "category": "Concrete & Cement",
    "currentSpecs": { ... }
  },
  "alternatives": [
    {
      "name": "LC3 Cement",
      "manufacturer": "Holcim",
      "sustainabilityScore": 85,
      "certifications": ["EPD", "Cradle to Cradle Silver"],
      "carbonFootprint": 450,
      "comparison": {
        "carbonReduction": "40%",
        "sustainabilityImprovement": 25
      }
    }
    // ... up to 5 alternatives
  ],
  "count": 5,
  "meta": { ... }
}
```

### Carbon Estimate (Free Tier)

```http
POST /api/v1/ai-gateway/carbon-estimate
Authorization: Bearer <token>

{
  "materials": [
    { "name": "Concrete", "quantity": 1000, "unit": "m3" },
    { "name": "Steel Rebar", "quantity": 50, "unit": "tons" }
  ],
  "projectDetails": { ... },
  "transportDistance": 150,
  "region": "US-West"
}
```

### Compliance Check (Standard/Pro Tier)

```http
POST /api/v1/ai-gateway/compliance-check
Authorization: Bearer <token>

{
  "materialId": "12345",
  "materialName": "FSC-Certified Plywood",
  "certifications": ["FSC", "EPD"],
  "standards": ["LEED v4.1", "BREEAM"],
  "context": "Office building project"
}
```

### RFQ Score (Standard/Pro Tier)

```http
POST /api/v1/ai-gateway/rfq-score
Authorization: Bearer <token>

{
  "rfqId": 456,                    // or provide requirements directly
  "requirements": { ... },
  "suppliers": [...],
  "priorities": {
    "sustainability": 0.3,
    "price": 0.25,
    "quality": 0.25,
    "delivery": 0.2
  }
}
```

### Draft Outreach (Premium/Enterprise Tier)

```http
POST /api/v1/ai-gateway/draft-outreach
Authorization: Bearer <token>

{
  "supplierId": 789,
  "rfqId": 456,                    // optional
  "template": "rfq_new_opportunity",
  "customData": { ... },           // optional
  "scheduledAt": "2026-01-10T09:00:00Z",  // optional
  "priority": "high"               // optional
}
```

### Get Available Templates

```http
GET /api/v1/ai-gateway/templates
Authorization: Bearer <token>
```

### Generic Workflow Execution

```http
POST /api/v1/ai-gateway/execute
Authorization: Bearer <token>

{
  "workflowName": "compliance-check",
  "version": "1.0.0",  // optional
  "input": {
    "material": "Cross-Laminated Timber",
    "standards": ["LEED v4.1", "BREEAM"]
  }
}
```

Response:
```json
{
  "success": true,
  "data": {
    "compliance": { ... }
  },
  "meta": {
    "workflowId": 1,
    "workflowName": "compliance-check",
    "version": "1.0.0",
    "cached": false,
    "latencyMs": 1234,
    "tokensUsed": 450,
    "quotaRemaining": 45
  }
}
```

### List Available Workflows

```http
GET /api/v1/ai-gateway/workflows
Authorization: Bearer <token>
```

### Check Entitlements & Quota

```http
GET /api/v1/ai-gateway/entitlements
Authorization: Bearer <token>
```

### View Usage History

```http
GET /api/v1/ai-gateway/history?limit=50&offset=0
Authorization: Bearer <token>
```

### Intercom Draft Workflow

1. **Create Draft**
```http
POST /api/v1/ai-gateway/drafts
{
  "targetUserId": 123,
  "messageType": "rfq_follow_up",
  "subject": "Following up on your RFQ",
  "body": "<p>Hi, just checking in...</p>"
}
```

2. **Submit for Approval**
```http
POST /api/v1/ai-gateway/drafts/:draftId/submit
```

3. **Approve (Legal Guardian only)**
```http
POST /api/v1/ai-gateway/drafts/:draftId/approve
{ "notes": "Approved for sending" }
```

4. **Send**
```http
POST /api/v1/ai-gateway/drafts/:draftId/send
```

## Environment Variables

```env
# Azure AI Foundry
AZURE_AI_FOUNDRY_ENDPOINT=https://your-resource.openai.azure.com
AZURE_AI_FOUNDRY_KEY=your-api-key
AZURE_AI_API_VERSION=2024-02-15-preview

# Intercom (for draft sending)
INTERCOM_ACCESS_TOKEN=your-intercom-token
```

## Database Schema

See `schema.sql` for the complete database schema including:

- `AI_Workflows` - Workflow registry
- `AI_Gateway_Calls` - Audit log
- `AI_User_Quotas` - Quota tracking
- `AI_Workflow_Cache` - Cached responses
- `Intercom_Drafts` - AI-generated drafts
- `Intercom_Opt_Outs` - User opt-outs
- `AI_Legal_Guardians` - Approval permissions

## Usage Examples

### Quick Execution (in route handlers)

```javascript
const aiGateway = require('../services/ai-gateway');

// Using the quick helper
app.post('/api/check-compliance', async (req, res) => {
  const result = await aiGateway.quick('compliance-checker', req.body, req);
  res.json(result);
});
```

### Direct Execution

```javascript
const result = await aiGateway.execute({
  workflowName: 'alternative-finder',
  input: { material: 'Portland Cement', region: 'US-West' },
  userId: req.user.id,
  context: {
    sessionId: req.session?.id,
    ipAddress: req.ip
  }
});
```

### Check User Entitlements

```javascript
const entitlements = await aiGateway.entitlements.getEntitlements(userId);
if (entitlements.quota.remaining <= 0) {
  return res.status(429).json({ error: 'Quota exceeded' });
}
```

## Intercom Message Gating

The Intercom sender module enforces strict controls:

1. **Tier Check**: Only Enterprise/Admin tiers can send AI-generated messages
2. **Legal Guardian Approval**: Marketing/campaign messages require approval
3. **Opt-Out Check**: Always verified before sending
4. **Retry Limits**: Max 3 send attempts before marking as failed

### Message Types & Requirements

| Type | Approval Required | Allowed Tiers |
|------|-------------------|---------------|
| single | ✅ | enterprise, admin |
| sequence | ✅ | enterprise, admin |
| campaign | ✅ | admin only |
| rfq_follow_up | ❌ (transactional) | pro, enterprise, admin |
| certification_reminder | ❌ (transactional) | pro, enterprise, admin |

## Caching Strategy

Safe workflows are cached to reduce latency and costs:

- **Redis** (fast, primary cache)
- **PostgreSQL** (persistent backup)

Cache invalidation:
```javascript
await aiGateway.workflowCache.invalidate(workflowId);
// or specific input
await aiGateway.workflowCache.invalidate(workflowId, { material: 'CLT' });
```

## Monitoring & Analytics

All calls are tracked in Azure Application Insights:

- `AIGateway_Call` - Every execution
- `AIGateway_CacheHit` - Cache hits
- `AIGateway_CacheMiss` - Cache misses
- `AIGateway_QuotaExceeded` - Quota violations
- `IntercomDraft_Created` - Draft creations
- `IntercomDraft_Sent` - Successful sends

Admin analytics endpoint:
```http
GET /api/v1/ai-gateway/admin/analytics?days=7
Authorization: Bearer <admin-token>
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| WORKFLOW_NOT_FOUND | 404 | Workflow doesn't exist |
| WORKFLOW_INACTIVE | 404 | Workflow is disabled |
| TIER_INSUFFICIENT | 403 | User tier too low |
| QUOTA_EXCEEDED | 429 | Usage limit reached |
| AI_SERVICE_ERROR | 502 | Azure AI call failed |
| TIMEOUT | 504 | Request timed out |
