# Database Migrations

This directory contains SQL migration scripts for incremental schema changes to the GreenChainz database.

## Migration Naming Convention

Migrations should follow this naming pattern:
```
YYYYMMDD_HHMMSS_descriptive_name.sql
```

**Examples**:
- `20251107_214500_add_rfq_tables.sql`
- `20251108_093000_add_search_indexes.sql`
- `20251110_150000_add_product_reviews.sql`

## Migration Structure

Each migration file should contain:

1. **Header comment** - Description and date
2. **Up migration** - Schema changes to apply
3. **Down migration** (optional) - Rollback instructions
4. **Verification queries** - Test that changes applied correctly

### Template

```sql
-- Migration: [Brief description]
-- Created: YYYY-MM-DD HH:MM:SS
-- Author: [Your name]
-- 
-- Description:
-- [Detailed explanation of what this migration does and why]

-- ============================================
-- UP MIGRATION
-- ============================================

-- Your schema changes here
CREATE TABLE IF NOT EXISTS Example_Table (
  ID BIGSERIAL PRIMARY KEY,
  Name VARCHAR(255) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_example_name ON Example_Table(Name);

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================
-- Uncomment these lines to rollback:
-- DROP INDEX IF EXISTS idx_example_name;
-- DROP TABLE IF EXISTS Example_Table;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these queries after migration to verify success:
-- SELECT COUNT(*) FROM Example_Table;
-- \d Example_Table
```

## How to Apply Migrations

### Manual Application (Development)

```bash
# Apply a single migration
docker exec -i greenchainz-db psql -U user -d greenchainz_dev < database-schemas/migrations/20251107_214500_migration.sql

# Or from PowerShell
Get-Content "database-schemas\migrations\20251107_214500_migration.sql" | docker exec -i greenchainz-db psql -U user -d greenchainz_dev
```

### Automated Migration Runner (Future)

We will implement a Node.js migration runner that:
- Tracks applied migrations in a `schema_migrations` table
- Applies migrations in order based on timestamp
- Prevents duplicate execution
- Supports up/down migrations
- Logs migration history

**Planned structure**:
```javascript
// backend/scripts/migrate.js
const migrations = [
  { id: '20251107_214500', file: 'add_rfq_tables.sql', applied: false },
  { id: '20251108_093000', file: 'add_search_indexes.sql', applied: true }
];
```

## Best Practices

### 1. Idempotent Migrations
Always use `IF NOT EXISTS` / `IF EXISTS` to make migrations safe to re-run:
```sql
CREATE TABLE IF NOT EXISTS MyTable (...);
CREATE INDEX IF NOT EXISTS idx_mytable_col ON MyTable(Col);
ALTER TABLE MyTable ADD COLUMN IF NOT EXISTS NewCol VARCHAR(255);
```

### 2. Data Migrations
When modifying data (not just schema), include both phases:
```sql
-- Add new column with default
ALTER TABLE Products ADD COLUMN IF NOT EXISTS IsActive BOOLEAN DEFAULT TRUE;

-- Backfill data for existing rows
UPDATE Products SET IsActive = TRUE WHERE IsActive IS NULL;

-- Make column NOT NULL after backfill
ALTER TABLE Products ALTER COLUMN IsActive SET NOT NULL;
```

### 3. Index Creation
Create indexes `CONCURRENTLY` in production to avoid table locks:
```sql
-- Development (fast, locks table briefly)
CREATE INDEX IF NOT EXISTS idx_products_sku ON Products(SKU);

-- Production (slower, no locks)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_sku ON Products(SKU);
```

### 4. Foreign Key Constraints
Add `ON DELETE` and `ON UPDATE` clauses explicitly:
```sql
ALTER TABLE Orders 
  ADD CONSTRAINT fk_orders_buyer 
  FOREIGN KEY (BuyerID) REFERENCES Buyers(BuyerID) 
  ON DELETE CASCADE;
```

### 5. Rollback Safety
Test rollback scripts before deploying to production:
```sql
-- Always provide a rollback path
-- DOWN MIGRATION
DROP INDEX IF EXISTS idx_products_new_field;
ALTER TABLE Products DROP COLUMN IF EXISTS NewField;
```

## Migration Tracking Table

Future migrations will be tracked in this table:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  MigrationID VARCHAR(255) PRIMARY KEY,
  Description TEXT,
  AppliedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  RolledBackAt TIMESTAMP,
  Status VARCHAR(50) DEFAULT 'applied' CHECK (Status IN ('applied', 'rolled_back', 'failed'))
);
```

## Historical Migrations

| Migration ID | Description | Applied Date |
|--------------|-------------|--------------|
| `initial_schema` | Base schema with Users, Companies, Suppliers, Certifications | 2025-11-05 |
| `20251107_214500` | RFQ tables (Buyers, RFQs, RFQ_Responses) | 2025-11-07 |
| `20251107_214900` | Search performance indexes (pg_trgm, GIN on Companies) | 2025-11-07 |

## Common Migration Scenarios

### Add a New Table
```sql
CREATE TABLE IF NOT EXISTS Reviews (
  ReviewID BIGSERIAL PRIMARY KEY,
  SupplierID BIGINT REFERENCES Suppliers(SupplierID) ON DELETE CASCADE,
  Rating INTEGER CHECK (Rating BETWEEN 1 AND 5),
  Comment TEXT,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_supplier ON Reviews(SupplierID);
```

### Add Column to Existing Table
```sql
-- Add nullable column first
ALTER TABLE Products ADD COLUMN IF NOT EXISTS CarbonFootprint DECIMAL(10,2);

-- Backfill with default value
UPDATE Products SET CarbonFootprint = 0.0 WHERE CarbonFootprint IS NULL;

-- Make NOT NULL after backfill (optional)
ALTER TABLE Products ALTER COLUMN CarbonFootprint SET NOT NULL;
```

### Modify Column Type
```sql
-- Create new column with desired type
ALTER TABLE Products ADD COLUMN IF NOT EXISTS Price_New DECIMAL(12,2);

-- Copy data with transformation
UPDATE Products SET Price_New = Price::DECIMAL(12,2);

-- Drop old column and rename new
ALTER TABLE Products DROP COLUMN IF EXISTS Price;
ALTER TABLE Products RENAME COLUMN Price_New TO Price;
```

### Add Enum Constraint
```sql
-- Add CHECK constraint for enum-like behavior
ALTER TABLE Orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE Orders ADD CONSTRAINT orders_status_check 
  CHECK (Status IN ('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'));
```

## Testing Migrations

Before applying to production:

1. **Test on a copy of production data**:
   ```bash
   # Restore production backup to test database
   pg_restore -U user -d greenchainz_test production_backup.dump
   
   # Apply migration
   psql -U user -d greenchainz_test < migration.sql
   
   # Run application tests
   npm test
   ```

2. **Measure performance impact**:
   ```sql
   -- Check index size
   SELECT pg_size_pretty(pg_relation_size('idx_products_sku'));
   
   -- Analyze query performance
   EXPLAIN ANALYZE SELECT * FROM Products WHERE SKU = 'ABC123';
   ```

3. **Verify data integrity**:
   ```sql
   -- Check for NULL values in NOT NULL columns
   SELECT COUNT(*) FROM Products WHERE RequiredColumn IS NULL;
   
   -- Verify foreign key relationships
   SELECT COUNT(*) FROM Orders o 
   LEFT JOIN Buyers b ON o.BuyerID = b.BuyerID 
   WHERE b.BuyerID IS NULL;
   ```

## Emergency Rollback

If a migration causes issues in production:

1. **Identify the problematic migration**
2. **Apply the DOWN migration section**
3. **Mark as rolled back in tracking table**:
   ```sql
   UPDATE schema_migrations 
   SET Status = 'rolled_back', RolledBackAt = CURRENT_TIMESTAMP
   WHERE MigrationID = '20251107_214500';
   ```

## Contact

For migration questions or to report issues:
- **Email**: dev@greenchainz.com
- **Slack**: #database-migrations
- **GitHub**: Open an issue with `[migration]` tag

---

**Last Updated**: 2025-11-07  
**Maintained By**: GreenChainz Engineering Team
