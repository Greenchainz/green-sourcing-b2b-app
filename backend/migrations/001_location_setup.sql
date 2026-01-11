-- Migration: Location Setup for RFQ and Supplier Matching
-- Created: 2026-01-08
-- Description: Adds location fields to Users and rfqs tables, creates materials and rfq_supplier_matches tables
-- 
-- NOTE: This migration uses the correct table names:
--   - Users (capitalized) with UserID primary key
--   - rfqs (lowercase) with id primary key
--   - These match the existing schema and code
-- ============================================
-- ADD LOCATION FIELDS TO USERS (SUPPLIERS)
-- ============================================
ALTER TABLE Users
ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE Users
ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE Users
ADD COLUMN IF NOT EXISTS state VARCHAR(50);
ALTER TABLE Users
ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20);
ALTER TABLE Users
ADD COLUMN IF NOT EXISTS country VARCHAR(50) DEFAULT 'USA';
ALTER TABLE Users
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE Users
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE Users
ADD COLUMN IF NOT EXISTS service_radius INTEGER DEFAULT 100;
-- ============================================
-- ADD LOCATION FIELDS TO RFQS
-- ============================================
-- First, ensure rfqs table exists (if not, it should be created by rfq-schema.sql first)
ALTER TABLE rfqs
ADD COLUMN IF NOT EXISTS project_latitude DECIMAL(10, 8);
ALTER TABLE rfqs
ADD COLUMN IF NOT EXISTS project_longitude DECIMAL(11, 8);
-- ============================================
-- CREATE MATERIALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS materials (
    id SERIAL PRIMARY KEY,
    assembly_code VARCHAR(50),
    assembly_name VARCHAR(255),
    location VARCHAR(50),
    material_type VARCHAR(255),
    manufacturer VARCHAR(255) NOT NULL,
    product_name VARCHAR(500) NOT NULL,
    epd_number VARCHAR(100),
    dimension VARCHAR(50),
    gwp DECIMAL(10, 2),
    gwp_units VARCHAR(50),
    declared_unit VARCHAR(100),
    msf_factor DECIMAL(10, 3),
    embodied_carbon_per_1000sf DECIMAL(10, 2),
    notes TEXT,
    source VARCHAR(50) DEFAULT 'manual',
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(manufacturer, product_name, epd_number)
);
-- ============================================
-- CREATE RFQ SUPPLIER MATCHES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS rfq_supplier_matches (
    id SERIAL PRIMARY KEY,
    rfq_id INTEGER REFERENCES rfqs(id) ON DELETE CASCADE,
    supplier_id INTEGER REFERENCES Users(UserID) ON DELETE CASCADE,
    distance_miles DECIMAL(10, 1),
    notified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(rfq_id, supplier_id)
);
-- ============================================
-- CREATE INDEXES
-- ============================================
-- Location indexes for Users (suppliers)
CREATE INDEX IF NOT EXISTS idx_users_location ON Users(latitude, longitude)
WHERE role = 'supplier'
    AND latitude IS NOT NULL
    AND longitude IS NOT NULL;
-- Location indexes for rfqs
CREATE INDEX IF NOT EXISTS idx_rfqs_location ON rfqs(project_latitude, project_longitude)
WHERE project_latitude IS NOT NULL
    AND project_longitude IS NOT NULL;
-- Materials indexes
CREATE INDEX IF NOT EXISTS idx_materials_manufacturer ON materials(manufacturer);
CREATE INDEX IF NOT EXISTS idx_materials_gwp ON materials(gwp);
CREATE INDEX IF NOT EXISTS idx_materials_assembly_code ON materials(assembly_code);
CREATE INDEX IF NOT EXISTS idx_materials_epd_number ON materials(epd_number);
-- RFQ supplier matches indexes
CREATE INDEX IF NOT EXISTS idx_rfq_matches_rfq ON rfq_supplier_matches(rfq_id);
CREATE INDEX IF NOT EXISTS idx_rfq_matches_supplier ON rfq_supplier_matches(supplier_id);
CREATE INDEX IF NOT EXISTS idx_rfq_matches_distance ON rfq_supplier_matches(rfq_id, distance_miles);
-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON COLUMN Users.latitude IS 'Latitude coordinate for supplier location (decimal degrees, -90 to 90)';
COMMENT ON COLUMN Users.longitude IS 'Longitude coordinate for supplier location (decimal degrees, -180 to 180)';
COMMENT ON COLUMN Users.service_radius IS 'Service radius in miles - how far supplier is willing to serve';
COMMENT ON COLUMN rfqs.project_latitude IS 'Latitude coordinate for project location (decimal degrees, -90 to 90)';
COMMENT ON COLUMN rfqs.project_longitude IS 'Longitude coordinate for project location (decimal degrees, -180 to 180)';
COMMENT ON TABLE rfq_supplier_matches IS 'Stores distance-matched suppliers for each RFQ based on location proximity';