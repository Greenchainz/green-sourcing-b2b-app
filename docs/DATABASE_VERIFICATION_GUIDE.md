# Database Verification Guide

## Quick Status Check

Run these commands to verify your database setup:

### 1. Check Which Tables Exist

```bash
# Option 1: Using the verification script
node backend/scripts/verify-database-tables.js

# Option 2: Direct psql query
psql $DATABASE_URL -c "\dt" | grep -E "rfqs|materials|rfq_"
```

### 2. Check Table Structure

```bash
# Check rfqs table structure
psql $DATABASE_URL -c "\d rfqs"

# Check materials table structure  
psql $DATABASE_URL -c "\d materials"

# Check Users table for location columns
psql $DATABASE_URL -c "\d Users" | grep -E "latitude|longitude|service_radius"
```

### 3. Test API Endpoints

```bash
# Set test token (get from login)
export TEST_TOKEN="your_jwt_token_here"

# Run API tests
node backend/scripts/test-api-endpoints.js
```

## Expected Tables

The backend code expects these **lowercase** table names:

| Table Name | Purpose | Required Columns |
|------------|---------|------------------|
| `rfqs` | Request for Quote records | `id`, `architect_id`, `project_name`, `project_location`, `project_latitude`, `project_longitude`, `material_type`, `status` |
| `rfq_responses` | Supplier responses to RFQs | `id`, `rfq_id`, `supplier_id`, `message`, `quoted_price`, `status` |
| `materials` | Material catalog | `id`, `assembly_code`, `manufacturer`, `product_name`, `epd_number`, `gwp` |
| `rfq_supplier_matches` | Distance-based supplier matching | `id`, `rfq_id`, `supplier_id`, `distance_miles` |
| `Users` | User accounts (with location fields) | `UserID`, `role`, `latitude`, `longitude`, `service_radius`, `address`, `city`, `state` |

## Known Issues

### Table Name Inconsistency

There may be a mismatch between:
- **Old migration** (`20251107_214500_add_rfq_tables.sql`) creates: `RFQs`, `RFQ_Responses` (capitalized)
- **New code** (`backend/routes/rfqs.js`) expects: `rfqs`, `rfq_responses` (lowercase)

**PostgreSQL behavior:** PostgreSQL converts unquoted identifiers to lowercase, so:
- `CREATE TABLE RFQs` becomes `rfqs` (lowercase in system)
- But queries must match the exact case used during creation

**Solution:**
1. Check what actually exists: `\dt` in psql
2. If capitalized tables exist, either:
   - Update code to use capitalized names (not recommended)
   - Create migration to rename tables (recommended)

## Migration Status

Check if migrations have been applied:

```bash
# List migration files
ls -la database-schemas/migrations/*.sql

# Check if rfq_supplier_matches table exists (added in geolocation migration)
psql $DATABASE_URL -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'rfq_supplier_matches');"
```

## Environment Variables Needed

Verify these are set:

```bash
# Database connection
echo $DATABASE_URL

# Azure Maps (for geocoding)
echo $AZURE_MAPS_KEY

# Azure AI Foundry
echo $AZURE_AI_FOUNDRY_ENDPOINT
```

## Quick Fixes

### If Tables Don't Match Expected Names

1. **Check what exists:**
   ```bash
   psql $DATABASE_URL -c "\dt"
   ```

2. **If capitalized tables exist (`RFQs` instead of `rfqs`):**
   - Option A: Use the schema file that matches your database
   - Option B: Create a migration to rename tables

3. **Run migrations:**
   ```bash
   # Apply geolocation migration (if not done)
   psql $DATABASE_URL < database-schemas/migrations/20260108_140000_add_geolocation_fields.sql
   
   # Apply materials migration (if not done)
   psql $DATABASE_URL < database-schemas/migrations/20260108_120000_add_materials_table.sql
   ```

## Verification Checklist

- [ ] `rfqs` table exists (or `RFQs`)
- [ ] `rfq_responses` table exists (or `RFQ_Responses`)
- [ ] `materials` table exists
- [ ] `rfq_supplier_matches` table exists
- [ ] `Users` table has location columns (`latitude`, `longitude`, `service_radius`)
- [ ] `rfqs` table has location columns (`project_latitude`, `project_longitude`)
- [ ] Environment variables are set (`DATABASE_URL`, `AZURE_MAPS_KEY`)
- [ ] API endpoints respond correctly
- [ ] Health check endpoint works
