# GreenChainz Swap Engine API

## Overview

REST API endpoints for material swap validation and regional pricing data, integrated with Azure PostgreSQL.

## Authentication

All endpoints use Azure Entra ID authentication. Include a valid bearer token in the Authorization header.

```
Authorization: Bearer <token>
```

## Endpoints

### Swap Validation

#### POST /api/swap-validation

Validates a material swap and stores the result.

**Request Body:**
```json
{
  "incumbentMaterialId": 123,
  "sustainableMaterialId": 456,
  "projectId": 789,          // optional
  "requestedBy": 1,          // optional
  "rfqId": 101               // optional
}
```

**Response:**
```json
{
  "success": true,
  "validation": {
    "id": 1,
    "validationStatus": "APPROVED",
    "overallScore": 95.5,
    "showstopperResults": [...],
    "passedChecks": 12,
    "failedChecks": 0,
    "skippedChecks": 0,
    "recommendation": "This swap is APPROVED..."
  }
}
```

#### GET /api/swap-validation

Retrieves validation history with filters.

**Query Parameters:**
- `incumbentMaterialId` (optional)
- `sustainableMaterialId` (optional)
- `projectId` (optional)
- `status` (optional) - APPROVED, EXPERIMENTAL, or REJECTED

**Response:**
```json
{
  "success": true,
  "validations": [...]
}
```

#### GET /api/swap-validation/[id]

Retrieves a single validation result by ID.

**Response:**
```json
{
  "success": true,
  "validation": {...}
}
```

#### PUT /api/swap-validation/[id]

Re-runs validation for an existing swap with updated data.

**Response:**
```json
{
  "success": true,
  "validation": {...}
}
```

### Pricing Data

#### GET /api/pricing-data

Retrieves regional pricing data with filters.

**Query Parameters:**
- `materialId` (optional)
- `state` (optional) - Two-letter state code (e.g., TX, CA)
- `county` (optional)
- `city` (optional)
- `source` (optional) - TXDOT, CRAFTSMAN, RSMEANS, HOME_DEPOT
- `isActive` (optional) - true/false

**Response:**
```json
{
  "success": true,
  "count": 25,
  "data": [
    {
      "id": 1,
      "materialId": 123,
      "pricePerUnit": 203.50,
      "unit": "CY",
      "currency": "USD",
      "state": "TX",
      "county": "Harris",
      "source": "TXDOT",
      "sourceDate": "2026-01-15T00:00:00.000Z",
      "dataConfidence": 85,
      "isActive": true
    }
  ]
}
```

#### POST /api/pricing-data

Creates a new pricing data entry.

**Request Body:**
```json
{
  "materialId": 123,
  "pricePerUnit": 203.50,
  "unit": "CY",
  "currency": "USD",
  "state": "TX",
  "county": "Harris",
  "source": "TXDOT",
  "sourceDate": "2026-01-15",
  "sourceUrl": "https://...",
  "projectName": "Highway 290 Expansion",
  "contractNumber": "CSJ 0271-05-088",
  "dataConfidence": 85
}
```

**Response:**
```json
{
  "success": true,
  "data": {...}
}
```

#### GET /api/pricing-data/regional-average

Calculates weighted average pricing for a material in a specific region.

**Query Parameters:**
- `materialId` (required)
- `state` (optional)
- `county` (optional)
- `city` (optional)

**Response:**
```json
{
  "success": true,
  "averagePrice": 215.75,
  "dataPoints": 12,
  "minPrice": 180.00,
  "maxPrice": 250.00,
  "standardDeviation": 18.50,
  "unit": "CY",
  "currency": "USD",
  "sources": ["TXDOT", "CRAFTSMAN"],
  "latestUpdate": "2026-01-15T00:00:00.000Z"
}
```

## Error Responses

All endpoints return standard error responses:

```json
{
  "error": "Error message description"
}
```

HTTP Status Codes:
- `400` - Bad Request (missing required fields, invalid parameters)
- `404` - Not Found
- `500` - Internal Server Error

## Database Schema

### material_technical_specs
Stores showstopper metrics for swap validation (38 columns including ASTM codes, fire ratings, structural specs, thermal/acoustic performance).

### pricing_data
Regional pricing from multiple sources (21 columns including price, location, source, confidence score).

### swap_validations
Validation results (24 columns including status, score, showstopper results, cost/carbon comparison).

### material_assembly_specs
Assembly-level specifications (14 columns including thickness, R-value, fire rating, UL design).

### assembly_spec_components
Junction table linking materials to assemblies (9 columns including layer order, quantity, thickness).

## Deployment

This API is deployed on Azure Container Apps with:
- **Database**: Azure PostgreSQL Flexible Server (greenchainz-db-prod)
- **Authentication**: Azure Entra ID with managed identity
- **CI/CD**: Azure DevOps pipeline (automatic deployment on push to main branch)
- **Domain**: https://greenchainz.com/api/*

## Local Development

1. Set `DATABASE_URL` environment variable:
```bash
export DATABASE_URL="postgresql://user:pass@greenchainz-db-prod.postgres.database.azure.com:5432/postgres?sslmode=require"
```

2. Run Prisma migrations:
```bash
npx prisma migrate deploy
```

3. Start development server:
```bash
npm run dev
```

4. Test endpoints:
```bash
curl http://localhost:3000/api/swap-validation?incumbentMaterialId=1&sustainableMaterialId=2
```
