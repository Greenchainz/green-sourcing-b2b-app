-- ============================================
-- RFQ Broadcast Schema (Migration)
-- Adds support for 1-to-many RFQ distribution
-- Aligning 'rfqs' table with 'schema.sql' conventions
-- ============================================

-- 1. Standardize Users table (if needed, though Postgres is case-insensitive, explicit rename helps clarity)
-- DO $$
-- BEGIN
--     IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Users') THEN
--         ALTER TABLE "Users" RENAME TO users;
--     END IF;
-- END $$;

-- 2. Modify rfqs table to match schema.sql conventions (buyer_id, rfq_id)
-- Handle renaming if old columns exist
DO $$
BEGIN
    -- Rename architect_id -> buyer_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rfqs' AND column_name = 'architect_id') THEN
        ALTER TABLE rfqs RENAME COLUMN architect_id TO buyer_id;
    END IF;

    -- Rename id -> rfq_id (if strict schema.sql compliance is needed, otherwise code can adapt)
    -- rfqs.js expects rfq_id in SELECTs but creates aliases.
    -- However, insert returns *. If table has id, and code expects rfq_id, it might fail if not aliased.
    -- Better to rename for consistency.
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rfqs' AND column_name = 'id') THEN
        ALTER TABLE rfqs RENAME COLUMN id TO rfq_id;
    END IF;

    -- Drop NOT NULL from supplier_id if it exists (for Broadcast support)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rfqs' AND column_name = 'supplier_id' AND is_nullable = 'NO') THEN
        ALTER TABLE rfqs ALTER COLUMN supplier_id DROP NOT NULL;
    END IF;
END $$;

-- 3. Add missing columns to rfqs table (Broadcast fields)
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS project_location VARCHAR(255);
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS project_latitude DECIMAL(10, 8);
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS project_longitude DECIMAL(11, 8);
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS project_timeline VARCHAR(100);
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS material_type VARCHAR(255);
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS quantity VARCHAR(100); -- schema.sql has quantity_needed DECIMAL, keeping strictly string if inconsistent or ensure alignment
-- Note: if quantity_needed exists, we might want to use it or alias it.
-- For now adding 'quantity' as used in code.

ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS specifications TEXT;
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS certifications_required TEXT[];
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS budget_range VARCHAR(100);
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS deadline TIMESTAMP;
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS supplier_id INTEGER; -- Add if missing entirely

-- 4. Table to store matches between RFQs and Suppliers
CREATE TABLE IF NOT EXISTS rfq_supplier_matches (
    match_id SERIAL PRIMARY KEY,
    rfq_id INTEGER NOT NULL,
    supplier_id INTEGER NOT NULL,
    distance_miles DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'matched', -- 'matched', 'notified', 'viewed', 'declined'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(rfq_id, supplier_id),
    FOREIGN KEY (rfq_id) REFERENCES rfqs(rfq_id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rfq_matches_rfq ON rfq_supplier_matches(rfq_id);
CREATE INDEX IF NOT EXISTS idx_rfq_matches_supplier ON rfq_supplier_matches(supplier_id);
