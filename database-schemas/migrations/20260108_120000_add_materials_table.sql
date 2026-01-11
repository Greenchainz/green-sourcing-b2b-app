-- Migration: Add Materials Table
-- Created: 2026-01-08 12:00:00
-- Author: GreenChainz Team
-- 
-- Description:
-- Creates the materials table for searching sustainable materials
-- with EPD data, manufacturers, and carbon metrics. Includes
-- full-text search indexes for fast material discovery.

-- ============================================
-- UP MIGRATION
-- ============================================

-- Materials table
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
  gwp DECIMAL(10,2),
  gwp_units VARCHAR(50),
  declared_unit VARCHAR(100),
  msf_factor DECIMAL(10,3),
  embodied_carbon_per_1000sf DECIMAL(10,2),
  notes TEXT,
  source VARCHAR(50) DEFAULT 'manual',
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT materials_unique UNIQUE(manufacturer, product_name, epd_number)
);

-- Indexes for fast search
CREATE INDEX IF NOT EXISTS idx_materials_manufacturer ON materials(manufacturer);
CREATE INDEX IF NOT EXISTS idx_materials_assembly ON materials(assembly_code);
CREATE INDEX IF NOT EXISTS idx_materials_epd ON materials(epd_number);
CREATE INDEX IF NOT EXISTS idx_materials_gwp ON materials(gwp);
CREATE INDEX IF NOT EXISTS idx_materials_type ON materials(material_type);

-- Full-text search index for fast text searching
CREATE INDEX IF NOT EXISTS idx_materials_search ON materials USING gin(
  to_tsvector('english', 
    COALESCE(product_name, '') || ' ' || 
    COALESCE(manufacturer, '') || ' ' || 
    COALESCE(material_type, '')
  )
);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_materials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_materials_updated_at
    BEFORE UPDATE ON materials
    FOR EACH ROW
    EXECUTE FUNCTION update_materials_updated_at();

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================
-- Uncomment these lines to rollback:
--
-- DROP TRIGGER IF EXISTS update_materials_updated_at ON materials;
-- DROP FUNCTION IF EXISTS update_materials_updated_at();
-- DROP INDEX IF EXISTS idx_materials_search;
-- DROP INDEX IF EXISTS idx_materials_type;
-- DROP INDEX IF EXISTS idx_materials_gwp;
-- DROP INDEX IF EXISTS idx_materials_epd;
-- DROP INDEX IF EXISTS idx_materials_assembly;
-- DROP INDEX IF EXISTS idx_materials_manufacturer;
-- DROP TABLE IF EXISTS materials;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these queries after migration to verify success:
--
-- Check table exists:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'materials';
--
-- Check indexes:
-- SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'materials';
--
-- Verify table structure:
-- \d+ materials
--
-- Test full-text search index:
-- SELECT id, product_name, manufacturer 
-- FROM materials 
-- WHERE to_tsvector('english', COALESCE(product_name, '') || ' ' || COALESCE(manufacturer, '')) 
-- @@ plainto_tsquery('english', 'test');
