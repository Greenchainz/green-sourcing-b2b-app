-- Migration: Supplier Dashboard Tables
-- Created: 2026-01-10
-- Description: Adds tables for Supplier Profiles, Product Ownership, and RFQ Responses

-- ============================================
-- 1. SUPPLIER PROFILES (Extension of Users)
-- ============================================
CREATE TABLE IF NOT EXISTS supplier_profiles (
    user_id BIGINT PRIMARY KEY REFERENCES Users(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    website_url VARCHAR(255),
    logo_url TEXT,
    description TEXT,
    
    -- Verification & Claiming
    is_claimed BOOLEAN DEFAULT false,
    claimed_at TIMESTAMP,
    claim_token VARCHAR(255) UNIQUE, -- For email link verification
    verification_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
    
    -- Business Data
    tax_id VARCHAR(50),
    masterformat_codes TEXT[], -- Array of codes e.g. ['092900', '033000']
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for finding unclaimed profiles
CREATE INDEX IF NOT EXISTS idx_supplier_claim_token ON supplier_profiles(claim_token);


-- ============================================
-- 2. SUPPLIER PRODUCTS (Inventory/Catalog)
-- ============================================
-- Links suppliers to the global materials catalog
CREATE TABLE IF NOT EXISTS supplier_products (
    id BIGSERIAL PRIMARY KEY,
    supplier_id BIGINT REFERENCES Users(id) ON DELETE CASCADE,
    material_id INTEGER REFERENCES materials(id) ON DELETE CASCADE,
    
    -- Supplier specific overrides
    sku VARCHAR(100),
    custom_name VARCHAR(255), -- If they call it something different
    price_per_unit DECIMAL(10, 2),
    currency VARCHAR(10) DEFAULT 'USD',
    
    is_in_stock BOOLEAN DEFAULT true,
    lead_time_days INTEGER,
    
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(supplier_id, material_id)
);


-- ============================================
-- 3. RFQ RESPONSES (Quotes)
-- ============================================
CREATE TABLE IF NOT EXISTS rfq_responses (
    id BIGSERIAL PRIMARY KEY,
    rfq_id INTEGER REFERENCES rfqs(id) ON DELETE CASCADE,
    supplier_id BIGINT REFERENCES Users(id) ON DELETE CASCADE,
    
    -- Status pipeline
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'sent', 'viewed', 'accepted', 'declined', 'lost'
    
    -- Quote Details
    quote_price DECIMAL(12, 2),
    quote_currency VARCHAR(10) DEFAULT 'USD',
    estimated_delivery_date DATE,
    valid_until DATE,
    
    message_to_buyer TEXT,
    attachments_urls TEXT[],
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_rfq_responses_supplier ON rfq_responses(supplier_id);
CREATE INDEX IF NOT EXISTS idx_rfq_responses_rfq ON rfq_responses(rfq_id);
CREATE INDEX IF NOT EXISTS idx_rfq_responses_status ON rfq_responses(status);


-- ============================================
-- 4. TRIGGER: Update 'Updated_At'
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_supplier_profiles_modtime
    BEFORE UPDATE ON supplier_profiles
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
