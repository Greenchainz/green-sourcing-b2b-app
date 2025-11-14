-- GreenChainz MVP Schema
-- This script initializes the database schema for the GreenChainz MVP.
-- It is idempotent and can be run multiple times safely.

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Role ENUM types for users and RFQs
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('buyer', 'supplier');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rfq_status') THEN
        CREATE TYPE rfq_status AS ENUM ('pending', 'responded', 'closed');
    END IF;
END
$$;

-- Suppliers Table
-- Stores information about material suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE suppliers IS 'Stores information about material suppliers.';

-- Users Table
-- Stores user account information for both buyers and suppliers
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE users IS 'Stores user account information for both buyers and suppliers.';

-- Products Table
-- Stores information about building materials
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    material_type TEXT,
    application TEXT,
    certifications TEXT[],
    sustainability_data JSONB,
    specs JSONB,
    images TEXT[],
    epd_url TEXT,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE products IS 'Stores information about building materials.';

-- Add foreign key constraint from products to suppliers
-- Note: Dropping and adding constraints makes the script idempotent.
ALTER TABLE products DROP CONSTRAINT IF EXISTS fk_products_supplier;
ALTER TABLE products ADD CONSTRAINT fk_products_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE;

-- RFQs (Request for Quotes) Table
-- Stores RFQs submitted by buyers
CREATE TABLE IF NOT EXISTS rfqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_email TEXT NOT NULL,
    product_id UUID NOT NULL,
    supplier_id UUID NOT NULL,
    message TEXT,
    project_details JSONB,
    status rfq_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE rfqs IS 'Stores RFQs submitted by buyers.';

-- Add foreign key constraints for RFQs
ALTER TABLE rfqs DROP CONSTRAINT IF EXISTS fk_rfqs_product;
ALTER TABLE rfqs ADD CONSTRAINT fk_rfqs_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE rfqs DROP CONSTRAINT IF EXISTS fk_rfqs_supplier;
ALTER TABLE rfqs ADD CONSTRAINT fk_rfqs_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_material_type ON products(material_type);
CREATE INDEX IF NOT EXISTS idx_products_certifications ON products USING GIN(certifications);
CREATE INDEX IF NOT EXISTS idx_rfqs_status ON rfqs(status);
CREATE INDEX IF NOT EXISTS idx_rfqs_supplier_id ON rfqs(supplier_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_product_id ON rfqs(product_id);
