# Quick Database Check Guide

## Step 1: Check What Tables Exist

```bash
# List all tables
psql $DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"

# Or use the verification script
node backend/scripts/verify-database-tables.js
```

## Step 2: Check Location Columns on Users Table

```bash
# Check Users table structure
psql $DATABASE_URL -c "\d Users"

# Look for these columns:
# - latitude
# - longitude
# - city
# - state
# - address
# - service_radius
```

## Step 3: Check RFQ Tables

```bash
# Check rfqs table structure
psql $DATABASE_URL -c "\d rfqs"

# Look for:
# - project_latitude
# - project_longitude
# - project_location

# Check rfq_responses table
psql $DATABASE_URL -c "\d rfq_responses"

# Should see: rfq_id, supplier_id, quoted_price, etc.
```

## Step 4: Check Materials and Matches Tables

```bash
# Check materials table
psql $DATABASE_URL -c "\d materials"

# Check rfq_supplier_matches table
psql $DATABASE_URL -c "\d rfq_supplier_matches"
```

## If Tables/Columns Don't Exist - Run Migration

```bash
# Run the location setup migration
psql $DATABASE_URL < backend/migrations/001_location_setup.sql

# Or if you prefer the existing migration:
psql $DATABASE_URL < database-schemas/migrations/20260108_140000_add_geolocation_fields.sql
psql $DATABASE_URL < database-schemas/migrations/20260108_120000_add_materials_table.sql
```

## Quick Test Sequence

### Test 1: Backend Health

```bash
cd backend
node index.js
# Should start without errors
# Look for: "✅ Server running on port 3001"
```

### Test 2: Create RFQ (with location)

```bash
# First, login to get token
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your_email","password":"your_password"}'

# Copy the token from response, then:
TOKEN="paste_token_here"

# Test RFQ creation
curl -X POST http://localhost:3001/api/v1/rfqs/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_name": "Test Building",
    "project_location": "San Francisco, CA",
    "material_type": "Low-carbon concrete",
    "quantity": "500 cubic yards",
    "project_timeline": "Standard (3-4 weeks)"
  }'

# Should return: {"success":true, "data":{...}}
```

### Test 3: Search Materials

```bash
curl "http://localhost:3001/api/v1/materials/search?query=concrete&maxGWP=100" \
  -H "Authorization: Bearer $TOKEN"
```

### Test 4: Frontend

```bash
# From project root
npm run dev
# Visit http://localhost:3000/materials
# Should load material search component
```

## Environment Variables Checklist

Check Azure Key Vault has these:

```bash
az keyvault secret list --vault-name GreenChainz-vault-2026 --query "[].name"
```

Should see:
- ✅ `DATABASE-URL`
- ✅ `JWT-SECRET` (or `AzureAD-ClientSecret`)
- ✅ `AZURE-AI-FOUNDRY-ENDPOINT`
- ✅ `AZURE-AI-FOUNDRY-API-KEY`
- ⚠️ `AZURE-MAPS-KEY` (might be missing)

### If AZURE-MAPS-KEY Missing:

```bash
# Option 1: Create new Azure Maps account
az maps account create \
  --name greenchainz-maps \
  --resource-group greenchainz-ai \
  --sku S0

# Get key
az maps account keys list \
  --name greenchainz-maps \
  --resource-group greenchainz-ai \
  --query "primaryKey" -o tsv

# Store in Key Vault
az keyvault secret set \
  --vault-name GreenChainz-vault-2026 \
  --name AZURE-MAPS-KEY \
  --value "paste_key_here"

# Option 2: If you already have Azure Maps account
az maps account keys list \
  --name <your-maps-account-name> \
  --resource-group <your-resource-group> \
  --query "primaryKey" -o tsv
```

## Expected Table Structure

### Users Table (capitalized)
- Primary Key: `UserID` (BIGINT)
- Location columns: `latitude`, `longitude`, `service_radius`, `address`, `city`, `state`, `zip_code`, `country`

### rfqs Table (lowercase)
- Primary Key: `id` (SERIAL/INTEGER)
- Location columns: `project_latitude`, `project_longitude`, `project_location`

### materials Table (lowercase)
- Primary Key: `id` (SERIAL)
- Columns: `manufacturer`, `product_name`, `epd_number`, `gwp`, etc.

### rfq_supplier_matches Table (lowercase)
- Primary Key: `id` (SERIAL)
- Foreign Keys: `rfq_id` → `rfqs(id)`, `supplier_id` → `Users(UserID)`
- Columns: `distance_miles`, `notified_at`
