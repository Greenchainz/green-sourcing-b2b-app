# Revit Integration API Documentation

> **Version:** 1.0.0  
> **Auth:** Azure Entra ID Only  
> **Base URL:** `https://api.greenchainz.com/api/integrations/revit/v1`

This document describes the backend API and database schema for integrating the Revit add-in (hosted in a separate repository) with the GreenChainz platform.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Authentication](#authentication)
4. [API Endpoints](#api-endpoints)
5. [Database Schema](#database-schema)
6. [Integration Flow](#integration-flow)
7. [Error Handling](#error-handling)
8. [For Revit Plugin Developers](#for-revit-plugin-developers)

---

## Overview

The Revit Integration API enables:

- **Plugin Registration**: Register Revit add-in instances with user accounts
- **Session Management**: Track active Revit sessions for sync operations
- **Project Sync**: Sync Revit projects with GreenChainz
- **Material Mapping**: Map Revit materials to verified sustainable products
- **Sustainability Scoring**: Real-time LEED, carbon, and EPD metrics
- **RFQ Generation**: Create RFQs directly from Revit project materials

### Key Features

| Feature | Description |
|---------|-------------|
| Real-time Scoring | Calculate sustainability scores as materials are synced |
| Auto-Mapping | AI-powered product matching based on material names |
| Certification Data | Access FSC, EPD, LEED credit data for mapped products |
| RFQ Integration | Generate RFQs for multiple suppliers in one action |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     REVIT ADD-IN (Separate Repo)                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ MSAL Auth    │───▶│ GC API Client│───▶│ Revit Plugin │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
└────────────────────────────────┬────────────────────────────────┘
                                 │ HTTPS + Azure Entra ID Token
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     GREENCHAINZ BACKEND                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ revitAuth.js │───▶│ routes/      │───▶│ PostgreSQL   │      │
│  │ middleware   │    │ revit.js     │    │ Database     │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

### Files Created

| File | Purpose |
|------|---------|
| `backend/middleware/revitAuth.js` | Azure Entra ID token validation middleware |
| `backend/routes/revit.js` | API route handlers |
| `backend/contracts/revit-v1.json` | Versioned JSON API contract |
| `backend/database-schemas/revit-integration.sql` | Database tables |
| `app/integrations/revit/page.tsx` | Next.js landing page |

---

## Authentication

### Azure Entra ID Flow

The Revit plugin authenticates users via Microsoft Authentication Library (MSAL):

1. User clicks "Sign In" in Revit add-in
2. MSAL opens Azure Entra ID login in browser
3. User authenticates with their Microsoft account
4. MSAL receives access token
5. Plugin includes token in API requests

### Required Headers

| Header | Description | Required |
|--------|-------------|----------|
| `Authorization` | `Bearer {access_token}` | Always |
| `X-Plugin-Instance-ID` | Unique plugin installation ID | After registration |
| `X-Revit-Version` | Revit version (e.g., "2024") | Optional |
| `X-Plugin-Version` | Plugin version (semver) | Optional |
| `X-Session-Token` | Active session token | For session-scoped operations |

### Azure Entra ID Configuration

The backend validates tokens against these settings:

```javascript
// Environment variables
AZURE_TENANT_ID         // Your Azure tenant (e.g., "contoso.onmicrosoft.com")
AZURE_REVIT_CLIENT_ID   // App registration Client ID for Revit plugin
// Falls back to AZURE_CLIENT_ID if not set
```

### Token Claims Used

| Claim | Purpose |
|-------|---------|
| `oid` | Azure Object ID (user identifier) |
| `tid` | Tenant ID |
| `preferred_username` | User email |
| `name` | Display name |
| `given_name` | First name |
| `family_name` | Last name |

---

## API Endpoints

### Info & Health

#### `GET /`
API information and health check (no auth required).

```json
{
  "api": "GreenChainz Revit Integration API",
  "version": "1.0.0",
  "status": "operational"
}
```

#### `GET /contract`
Returns the full JSON API contract schema.

---

### Plugin Registration

#### `POST /register`
Register a Revit plugin instance.

**Request:**
```json
{
  "pluginInstanceId": "550e8400-e29b-41d4-a716-446655440000",
  "revitVersion": "2024",
  "pluginVersion": "1.0.0",
  "machineName": "WORKSTATION-01"
}
```

**Response:**
```json
{
  "success": true,
  "registrationId": 123,
  "status": "created",
  "message": "Plugin registered successfully"
}
```

#### `DELETE /register/:pluginInstanceId`
Deactivate a plugin registration.

---

### Session Management

#### `POST /sessions`
Start a new sync session.

**Request:**
```json
{
  "projectFileHash": "a1b2c3d4e5f6...",
  "projectName": "Office Tower Phase 1",
  "projectPath": "C:\\Projects\\OfficeTower.rvt"
}
```

**Response:**
```json
{
  "success": true,
  "session": {
    "id": 456,
    "token": "abc123def456...",
    "startedAt": "2026-01-04T10:00:00Z"
  }
}
```

#### `DELETE /sessions/:sessionToken`
End a session.

#### `POST /sessions/:sessionToken/heartbeat`
Keep session alive (call every 5-10 minutes).

---

### Projects

#### `GET /projects`
List user's synced Revit projects.

**Query Parameters:**
- `limit` (int, default: 50)
- `offset` (int, default: 0)
- `status` (string: pending|syncing|synced|error)

#### `POST /projects`
Create or update a project.

**Request:**
```json
{
  "projectFileHash": "sha256hash...",
  "projectName": "Green Office Complex",
  "projectNumber": "PRJ-2026-001",
  "clientName": "Sustainable Developments LLC",
  "location": "Austin, TX",
  "buildingType": "Commercial",
  "grossArea": 150000,
  "areaUnit": "sqft",
  "targetCertification": "LEED Gold"
}
```

#### `GET /projects/:projectId/score`
Get sustainability score for a project.

**Response:**
```json
{
  "projectId": 789,
  "projectName": "Green Office Complex",
  "score": {
    "overall": 72,
    "leedPointsTotal": 8.5,
    "totalEmbodiedCarbonKg": 45000.50,
    "carbonPerSqft": 0.30
  },
  "coverage": {
    "totalMaterials": 150,
    "mappedMaterials": 120,
    "verifiedMaterials": 80,
    "mappingPercentage": 80,
    "fscPercentage": 35,
    "epdPercentage": 45
  },
  "recommendations": [
    {
      "type": "fsc",
      "priority": "medium",
      "message": "Consider specifying more FSC-certified wood products for LEED MR credits"
    }
  ],
  "calculatedAt": "2026-01-04T10:30:00Z"
}
```

---

### Materials

#### `GET /projects/:projectId/materials`
Get materials for a project.

**Query Parameters:**
- `status` (string: unmapped|auto_mapped|manual_mapped|verified|rejected)
- `limit` (int, default: 100)
- `offset` (int, default: 0)

#### `POST /projects/:projectId/materials/sync`
Sync materials from Revit.

**Request:**
```json
{
  "materials": [
    {
      "revitMaterialId": "12345",
      "name": "Concrete - 4000 PSI",
      "category": "Concrete",
      "totalArea": 5000.5,
      "totalVolume": 250.25,
      "totalCount": null,
      "quantityUnit": "sqft"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "results": {
    "created": 45,
    "updated": 12,
    "failed": 0,
    "errors": []
  },
  "message": "Synced 57 materials"
}
```

#### `POST /materials/:mappingId/map`
Map a material to a GreenChainz product.

**Request:**
```json
{
  "productId": 123,
  "categoryId": 5
}
```

---

### Product Search

#### `GET /products/search`
Search for products to map materials to.

**Query Parameters:**
- `q` (string, required, min 2 chars) - Search query
- `category` (string) - Filter by category
- `limit` (int, default: 20)

#### `POST /products/match`
Auto-match material names to products.

**Request:**
```json
{
  "materialNames": [
    "Concrete - 4000 PSI",
    "Gypsum Board Type X"
  ]
}
```

**Response:**
```json
{
  "matches": [
    {
      "materialName": "Concrete - 4000 PSI",
      "suggestions": [
        {
          "productId": 456,
          "productName": "EcoCrete 4000",
          "category": "Concrete",
          "confidence": 0.85
        }
      ]
    }
  ],
  "matchedCount": 2,
  "totalCount": 2
}
```

---

### RFQ Generation

#### `POST /rfq`
Create RFQs from mapped materials.

**Request:**
```json
{
  "projectId": 789,
  "materialMappingIds": [1, 2, 3, 4, 5],
  "message": "Please provide quotes for the listed materials",
  "deadline": "2026-02-15"
}
```

**Response:**
```json
{
  "success": true,
  "rfqs": [
    {
      "rfqId": 101,
      "supplierId": 50,
      "materialCount": 3
    },
    {
      "rfqId": 102,
      "supplierId": 51,
      "materialCount": 2
    }
  ],
  "message": "Created 2 RFQ(s) for 5 materials"
}
```

---

## Database Schema

### Tables Created

| Table | Purpose |
|-------|---------|
| `Revit_Plugin_Registrations` | Registered plugin instances |
| `Revit_Sessions` | Active/historical sync sessions |
| `Revit_Projects` | Synced Revit projects |
| `Revit_Material_Mappings` | Material to product mappings |
| `Revit_Sync_Events` | Immutable event log |
| `Revit_Sustainability_Snapshots` | Point-in-time score snapshots |
| `Revit_API_Tokens` | Short-lived API tokens (future use) |

### Apply Schema

```bash
# Apply the Revit integration schema
psql $DATABASE_URL -f backend/database-schemas/revit-integration.sql
```

---

## Integration Flow

### First-Time Setup (Revit Plugin)

```
1. Plugin generates unique pluginInstanceId (UUID)
2. User clicks "Sign In"
3. MSAL authenticates user via Azure Entra ID
4. Plugin calls POST /register with:
   - pluginInstanceId
   - revitVersion
   - pluginVersion
   - machineName
5. Backend creates/updates registration
6. Plugin stores registrationId for future use
```

### Material Sync Flow

```
1. User opens Revit project
2. Plugin calls POST /sessions with project info
3. Backend returns session token
4. Plugin extracts materials from Revit model
5. Plugin calls POST /projects to create/update project
6. Plugin calls POST /projects/:id/materials/sync with materials
7. Plugin calls GET /projects/:id/score for sustainability data
8. User maps unmapped materials via plugin UI
9. Plugin calls POST /materials/:id/map for each mapping
10. When done, plugin calls DELETE /sessions/:token
```

### RFQ Flow

```
1. User selects materials in Revit
2. Plugin identifies mapped materials with products
3. Plugin calls POST /rfq with:
   - projectId
   - materialMappingIds (selected materials)
   - optional message/deadline
4. Backend creates RFQs grouped by supplier
5. Suppliers receive RFQ notifications
```

---

## Error Handling

### Error Response Format

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable description",
  "code": "REVIT_XXX_000"
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `REVIT_AUTH_001` | Access token required |
| `REVIT_AUTH_002` | Invalid or expired Azure token |
| `REVIT_AUTH_003` | Token missing required claims |
| `REVIT_REG_002` | Plugin instance ID header required |
| `REVIT_REG_003` | Plugin not registered |
| `REVIT_REG_004` | Plugin registration deactivated |
| `REVIT_SESSION_001` | Session token required |
| `REVIT_SESSION_002` | Active session not found |
| `REVIT_PROJ_404` | Project not found |
| `REVIT_MAP_403` | Not authorized to modify mapping |
| `REVIT_MAP_404` | Material mapping not found |

---

## For Revit Plugin Developers

### Getting Started

1. **Clone the Revit plugin repo** (separate from this repo)
2. **Register Azure App**:
   - Go to Azure Portal → App Registrations
   - Create new registration
   - Set redirect URI: `http://localhost` (for desktop apps)
   - Enable public client flow
   - Note the Client ID
3. **Configure MSAL** in plugin with:
   - Client ID
   - Tenant ID (or "common" for multi-tenant)
   - Scopes: `openid profile email`
4. **Implement API client** using the contract at `/api/integrations/revit/v1/contract`

### Recommended SDK Flow

```csharp
// C# example for Revit add-in
public class GreenChainzClient
{
    private readonly IPublicClientApplication _msal;
    private readonly HttpClient _http;
    private string _accessToken;
    private string _sessionToken;
    
    public async Task<bool> SignInAsync()
    {
        var result = await _msal.AcquireTokenInteractive(Scopes)
            .WithPrompt(Prompt.SelectAccount)
            .ExecuteAsync();
        _accessToken = result.AccessToken;
        return !string.IsNullOrEmpty(_accessToken);
    }
    
    public async Task<SessionResponse> StartSessionAsync(string projectHash, string projectName)
    {
        var response = await PostAsync("/sessions", new {
            projectFileHash = projectHash,
            projectName = projectName
        });
        _sessionToken = response.Session.Token;
        return response;
    }
    
    private async Task<T> PostAsync<T>(string path, object body)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, BaseUrl + path);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _accessToken);
        request.Headers.Add("X-Plugin-Instance-ID", PluginInstanceId);
        request.Headers.Add("X-Session-Token", _sessionToken);
        request.Content = new StringContent(JsonConvert.SerializeObject(body));
        // ... send and deserialize
    }
}
```

### Testing

1. Use the API info endpoint (no auth): `GET /api/integrations/revit/v1/`
2. Obtain a test token from Azure Entra ID
3. Register a test plugin instance
4. Start a session and sync test materials

### Rate Limits

| Operation | Limit |
|-----------|-------|
| General | 100 requests/minute |
| Material sync | 10 requests/minute |

---

## Related Documentation

- [Azure Authentication Setup](./OAUTH_SETUP.md)
- [Azure Secrets & Config](./AZURE_SECRETS_AND_CONFIG.md)
- [API Contract JSON](/api/integrations/revit/v1/contract)
- [Main Backend README](../backend/README.md)
