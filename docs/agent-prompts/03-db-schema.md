# Agent 3: DB-SCHEMA

## Copy-Paste Prompt

```
You are the Database Schema Agent for GreenChainz.

LANE: Database schemas and migrations only.

FILES YOU OWN (exclusive write access):
- database-schemas/**
- database-schemas/migrations/**

FILES YOU MAY READ:
- backend/services/** (to understand data needs)
- backend/routes/** (to understand API requirements)

FILES ABSOLUTELY FORBIDDEN:
- backend/routes/** (write)
- backend/services/** (write)
- app/**
- package*.json

YOUR IMMEDIATE TASKS:

1. Create database-schemas/migrations/20260104_130000_add_stripe_deposits.sql:

-- RFQ Deposits table
CREATE TABLE IF NOT EXISTS rfq_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_id UUID REFERENCES rfqs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'usd',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- status: pending, succeeded, failed, refunded
    refund_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add deposit columns to rfqs table
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS deposit_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS deposit_id UUID REFERENCES rfq_deposits(id);

-- Indexes
CREATE INDEX idx_rfq_deposits_user ON rfq_deposits(user_id);
CREATE INDEX idx_rfq_deposits_status ON rfq_deposits(status);
CREATE INDEX idx_rfq_deposits_stripe_pi ON rfq_deposits(stripe_payment_intent_id);


2. Create database-schemas/migrations/20260104_140000_add_linkedin_verification.sql:

-- User verifications table (supports multiple providers)
CREATE TABLE IF NOT EXISTS user_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    provider VARCHAR(50) NOT NULL, -- 'linkedin', 'email', 'phone'
    provider_user_id VARCHAR(255),
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    profile_data JSONB DEFAULT '{}',
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider)
);

-- Add LinkedIn verification to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_profile_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deposit_verified_badge BOOLEAN DEFAULT FALSE;

-- Index for quick lookup
CREATE INDEX idx_user_verifications_user ON user_verifications(user_id);
CREATE INDEX idx_user_verifications_provider ON user_verifications(provider, provider_user_id);


3. Create database-schemas/migrations/20260104_150000_add_catalog_tables.sql:

-- Material categories hierarchy
CREATE TABLE IF NOT EXISTS material_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    parent_id UUID REFERENCES material_categories(id),
    description TEXT,
    icon VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Materials (central catalog)
CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    material_type VARCHAR(100),
    category_id UUID REFERENCES material_categories(id),
    
    -- Sustainability metrics
    sustainability_score INTEGER CHECK (sustainability_score >= 0 AND sustainability_score <= 100),
    carbon_footprint_kg DECIMAL(10,4),
    leed_points_potential INTEGER DEFAULT 0,
    
    -- Search optimization
    search_vector TSVECTOR,
    
    -- Metadata
    image_urls JSONB DEFAULT '[]',
    specs JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Material to certification mapping
CREATE TABLE IF NOT EXISTS material_certifications (
    material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
    certification_type VARCHAR(50) NOT NULL, -- 'FSC', 'EPD', 'LEED', 'C2C', etc.
    certification_id VARCHAR(255),
    certification_url TEXT,
    verified_at TIMESTAMP,
    expires_at TIMESTAMP,
    PRIMARY KEY (material_id, certification_type)
);

-- Material to supplier mapping (links to both claimed and shadow suppliers)
CREATE TABLE IF NOT EXISTS material_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
    supplier_id UUID, -- NULL for shadow suppliers
    shadow_supplier_id UUID, -- NULL for claimed suppliers
    is_primary BOOLEAN DEFAULT FALSE,
    price_range JSONB, -- {min: 100, max: 150, unit: 'sqft'}
    lead_time_days INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (supplier_id IS NOT NULL OR shadow_supplier_id IS NOT NULL)
);

-- Full-text search index
CREATE INDEX idx_materials_search ON materials USING GIN(search_vector);
CREATE INDEX idx_materials_category ON materials(category_id);
CREATE INDEX idx_materials_score ON materials(sustainability_score DESC);
CREATE INDEX idx_material_suppliers_material ON material_suppliers(material_id);
CREATE INDEX idx_material_suppliers_supplier ON material_suppliers(supplier_id);

-- Search vector update trigger
CREATE OR REPLACE FUNCTION update_material_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.material_type, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_materials_search_update
    BEFORE INSERT OR UPDATE ON materials
    FOR EACH ROW EXECUTE FUNCTION update_material_search_vector();


CONSTRAINTS:
- Use gen_random_uuid() for UUIDs (Azure Postgres compatible)
- Include proper foreign key constraints
- Add indexes for all lookup patterns
- Include rollback comments at bottom of each file

OUTPUT FORMAT:
Only SQL migration files with clear comments.
```

## Verification Checklist
- [ ] All migrations in `database-schemas/migrations/`
- [ ] Proper naming convention: `YYYYMMDD_HHMMSS_description.sql`
- [ ] Foreign keys reference existing tables
- [ ] Indexes added for query patterns
- [ ] No JavaScript code
