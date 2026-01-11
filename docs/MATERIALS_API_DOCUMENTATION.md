# Materials API Documentation

## Overview

The Materials API provides REST endpoints for searching and retrieving sustainable building materials with EPD (Environmental Product Declaration) data, manufacturer information, and carbon metrics.

**Base URL:** `/api/v1/materials`

**Authentication:** All endpoints require a valid JWT token in the `Authorization` header.

---

## Table of Contents

1. [GET /search](#get-search)
2. [GET /meta/assemblies](#get-metaassemblies)
3. [GET /meta/manufacturers](#get-metamanufacturers)
4. [GET /:id](#get-id)
5. [Error Responses](#error-responses)
6. [Data Models](#data-models)

---

## GET /search

Search materials with filters, pagination, and sorting.

### Endpoint

```
GET /api/v1/materials/search
```

### Authentication

Requires: `Authorization: Bearer <JWT_TOKEN>`

### Query Parameters

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `query` | string | No | `""` | Search term for full-text search on product name, manufacturer, and material type |
| `manufacturer` | string | No | - | Filter by exact manufacturer name |
| `assemblyCode` | string | No | - | Filter by assembly code (e.g., "EWS-1", "EWS-2") |
| `materialType` | string | No | - | Filter by material type (partial match, case-insensitive) |
| `minGWP` | number | No | - | Minimum Global Warming Potential value |
| `maxGWP` | number | No | - | Maximum Global Warming Potential value |
| `hasEPD` | boolean | No | - | Filter by EPD availability (`true`/`false`) |
| `isVerified` | boolean | No | - | Filter by verification status (`true`/`false`) |
| `page` | integer | No | `1` | Page number for pagination |
| `limit` | integer | No | `20` | Number of results per page (max: 100) |
| `sortBy` | string | No | `gwp` | Sort field: `gwp`, `product_name`, `manufacturer`, `created_at` |
| `sortOrder` | string | No | `asc` | Sort direction: `asc` or `desc` |

### Request Example

```bash
curl -X GET "https://api.greenchainz.com/api/v1/materials/search?query=concrete&minGWP=0&maxGWP=100&hasEPD=true&page=1&limit=20&sortBy=gwp&sortOrder=asc" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Response Format

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "materials": [
      {
        "id": 1,
        "assembly_code": "EWS-1",
        "assembly_name": "Unitized Curtain Wall System",
        "material_type": "Concrete",
        "manufacturer": "US Gypsum",
        "product_name": "Type X Drywall",
        "epd_number": "EPD-12345",
        "gwp": 85.5,
        "gwp_units": "kg CO2-eq",
        "dimension": "5/8\" x 4' x 8'",
        "embodied_carbon_per_1000sf": 1250.0,
        "is_verified": true,
        "notes": "LEED certified"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

### Field Descriptions

| Field | Type | Description |
| --- | --- | --- |
| `id` | integer | Unique material identifier |
| `assembly_code` | string | Assembly classification code |
| `assembly_name` | string | Human-readable assembly name |
| `material_type` | string | Type of material (e.g., "Concrete", "Steel", "Glass") |
| `manufacturer` | string | Manufacturer name |
| `product_name` | string | Product name/model |
| `epd_number` | string | Environmental Product Declaration number |
| `gwp` | number | Global Warming Potential value |
| `gwp_units` | string | Units for GWP (typically "kg CO2-eq") |
| `dimension` | string | Product dimensions |
| `embodied_carbon_per_1000sf` | number | Embodied carbon per 1000 square feet |
| `is_verified` | boolean | Whether the material data has been verified |
| `notes` | string | Additional notes or certifications |

### Example Use Cases

**1. Search for low-carbon concrete materials:**

```bash
curl -X GET "https://api.greenchainz.com/api/v1/materials/search?materialType=concrete&maxGWP=50&hasEPD=true&sortBy=gwp&sortOrder=asc" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**2. Find materials by specific manufacturer:**

```bash
curl -X GET "https://api.greenchainz.com/api/v1/materials/search?manufacturer=US%20Gypsum&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**3. Search with full-text query:**

```bash
curl -X GET "https://api.greenchainz.com/api/v1/materials/search?query=low%20carbon%20glass&isVerified=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## GET /meta/assemblies

Get unique assembly types with material counts.

### Endpoint

```
GET /api/v1/materials/meta/assemblies
```

### Authentication

Requires: `Authorization: Bearer <JWT_TOKEN>`

### Query Parameters

None

### Request Example

```bash
curl -X GET "https://api.greenchainz.com/api/v1/materials/meta/assemblies" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Response Format

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "assemblies": [
      {
        "assembly_code": "EWS-1",
        "assembly_name": "Unitized Curtain Wall System",
        "material_count": 25
      },
      {
        "assembly_code": "EWS-2",
        "assembly_name": "Window Wall System",
        "material_count": 18
      },
      {
        "assembly_code": "EWS-3",
        "assembly_name": "Storefront System",
        "material_count": 12
      }
    ]
  }
}
```

### Field Descriptions

| Field | Type | Description |
| --- | --- | --- |
| `assembly_code` | string | Unique assembly classification code |
| `assembly_name` | string | Human-readable assembly name |
| `material_count` | integer | Number of materials in this assembly |

### Example Use Cases

**Populate assembly filter dropdown:**

Use this endpoint to get all available assembly types for filtering in the UI.

---

## GET /meta/manufacturers

Get unique manufacturers with product counts and statistics.

### Endpoint

```
GET /api/v1/materials/meta/manufacturers
```

### Authentication

Requires: `Authorization: Bearer <JWT_TOKEN>`

### Query Parameters

None

### Request Example

```bash
curl -X GET "https://api.greenchainz.com/api/v1/materials/meta/manufacturers" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Response Format

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "manufacturers": [
      {
        "manufacturer": "US Gypsum",
        "product_count": 45,
        "epd_count": 38,
        "avg_gwp": 92.5
      },
      {
        "manufacturer": "Kawneer North America",
        "product_count": 32,
        "epd_count": 28,
        "avg_gwp": 125.3
      },
      {
        "manufacturer": "Vitro / Guardian / AGC",
        "product_count": 28,
        "epd_count": 25,
        "avg_gwp": 78.9
      }
    ]
  }
}
```

### Field Descriptions

| Field | Type | Description |
| --- | --- | --- |
| `manufacturer` | string | Manufacturer name |
| `product_count` | integer | Total number of products from this manufacturer |
| `epd_count` | integer | Number of products with EPDs |
| `avg_gwp` | number | Average Global Warming Potential across all products |

### Example Use Cases

**Display manufacturer statistics:**

Use this endpoint to show manufacturers with the most products, best EPD coverage, or lowest average GWP.

---

## GET /:id

Get detailed information for a single material.

### Endpoint

```
GET /api/v1/materials/:id
```

### Authentication

Requires: `Authorization: Bearer <JWT_TOKEN>`

### URL Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes | Material ID |

### Request Example

```bash
curl -X GET "https://api.greenchainz.com/api/v1/materials/123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Response Format

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "material": {
      "id": 123,
      "assembly_code": "EWS-1",
      "assembly_name": "Unitized Curtain Wall System",
      "location": "INTERIOR/EXTERIOR",
      "material_type": "Concrete",
      "manufacturer": "US Gypsum",
      "product_name": "Type X Drywall",
      "epd_number": "EPD-12345",
      "dimension": "5/8\" x 4' x 8'",
      "gwp": 85.5,
      "gwp_units": "kg CO2-eq",
      "declared_unit": "1 m²",
      "msf_factor": 10.764,
      "embodied_carbon_per_1000sf": 1250.0,
      "notes": "LEED certified, FSC certified",
      "source": "manual",
      "is_verified": true,
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-20T14:22:00.000Z"
    }
  }
}
```

### Error Responses

**400 Bad Request - Invalid ID:**

```json
{
  "success": false,
  "error": "Invalid material ID"
}
```

**404 Not Found:**

```json
{
  "success": false,
  "error": "Material not found"
}
```

### Example Use Cases

**Display material detail page:**

Use this endpoint to show full material details including all EPD data, certifications, and carbon metrics.

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request

Invalid request parameters or malformed request.

```json
{
  "success": false,
  "error": "Error description",
  "message": "Detailed error message"
}
```

### 401 Unauthorized

Missing or invalid authentication token.

```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### 404 Not Found

Resource not found.

```json
{
  "success": false,
  "error": "Resource not found"
}
```

### 500 Internal Server Error

Server error.

```json
{
  "success": false,
  "error": "Operation failed",
  "message": "Detailed error message"
}
```

---

## Data Models

### Material Object

```typescript
interface Material {
  id: number;
  assembly_code: string | null;
  assembly_name: string | null;
  location: string | null;
  material_type: string | null;
  manufacturer: string;
  product_name: string;
  epd_number: string | null;
  dimension: string | null;
  gwp: number | null;
  gwp_units: string | null;
  declared_unit: string | null;
  msf_factor: number | null;
  embodied_carbon_per_1000sf: number | null;
  notes: string | null;
  source: string;
  is_verified: boolean;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}
```

### Assembly Object

```typescript
interface Assembly {
  assembly_code: string;
  assembly_name: string;
  material_count: number;
}
```

### Manufacturer Object

```typescript
interface Manufacturer {
  manufacturer: string;
  product_count: number;
  epd_count: number;
  avg_gwp: number | null;
}
```

### Pagination Object

```typescript
interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

---

## Best Practices

### 1. Pagination

Always use pagination for search results to improve performance:

```bash
# Good: Limited results
GET /api/v1/materials/search?page=1&limit=20

# Bad: No pagination (may return thousands of results)
GET /api/v1/materials/search
```

### 2. Filtering

Combine multiple filters for precise results:

```bash
# Find verified, low-carbon concrete with EPDs
GET /api/v1/materials/search?materialType=concrete&maxGWP=50&hasEPD=true&isVerified=true
```

### 3. Sorting

Use appropriate sorting for your use case:

```bash
# Sort by lowest GWP for sustainability-focused search
GET /api/v1/materials/search?sortBy=gwp&sortOrder=asc

# Sort alphabetically for browsing
GET /api/v1/materials/search?sortBy=product_name&sortOrder=asc
```

### 4. Caching

Consider caching metadata endpoints (`/meta/assemblies`, `/meta/manufacturers`) as they change infrequently.

### 5. Error Handling

Always handle error responses and display user-friendly messages:

```javascript
try {
  const response = await fetch('/api/v1/materials/search', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  
  if (!data.success) {
    console.error('API Error:', data.error);
    // Display error to user
  }
} catch (error) {
  console.error('Network Error:', error);
  // Handle network errors
}
```

---

## Rate Limiting

Currently, no rate limits are enforced. However, clients should:

- Implement client-side rate limiting
- Cache responses when appropriate
- Use pagination to limit result sets
- Avoid excessive polling

---

## Versioning

This is version 1 (`v1`) of the Materials API. Future versions will maintain backward compatibility or provide migration paths.

---

## Support

For API support, please contact:
- Email: api-support@greenchainz.com
- Documentation: https://docs.greenchainz.com/api/materials

---

**Last Updated:** January 8, 2025
