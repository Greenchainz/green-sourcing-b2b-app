-- EWS Materials Schema
-- Stores materials from EWS (Environmental Wall Systems) sheet
-- This schema supports structured EPD data with manufacturers, products, and carbon metrics
CREATE TABLE IF NOT EXISTS ews_materials (
    id SERIAL PRIMARY KEY,
    assembly_code VARCHAR(50) NOT NULL,
    assembly_name VARCHAR(255) NOT NULL,
    location VARCHAR(50),
    -- INTERIOR/EXTERIOR
    material_type VARCHAR(255),
    manufacturer VARCHAR(255) NOT NULL,
    product_name VARCHAR(500) NOT NULL,
    epd_number VARCHAR(100),
    dimension VARCHAR(50),
    gwp DECIMAL(10, 2),
    -- Global Warming Potential
    gwp_units VARCHAR(50),
    -- e.g., 'kg CO2 eq'
    declared_unit VARCHAR(100),
    msf_factor DECIMAL(10, 3),
    -- MSF (Material Safety Factor)
    embodied_carbon_per_1000sf DECIMAL(10, 2),
    notes TEXT,
    source VARCHAR(50) DEFAULT 'ews-sheet',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT ews_materials_unique UNIQUE(assembly_code, manufacturer, product_name)
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ews_materials_manufacturer ON ews_materials(manufacturer);
CREATE INDEX IF NOT EXISTS idx_ews_materials_assembly_code ON ews_materials(assembly_code);
CREATE INDEX IF NOT EXISTS idx_ews_materials_epd_number ON ews_materials(epd_number);
CREATE INDEX IF NOT EXISTS idx_ews_materials_gwp ON ews_materials(gwp);
CREATE INDEX IF NOT EXISTS idx_ews_materials_product_name ON ews_materials(product_name);
CREATE INDEX IF NOT EXISTS idx_ews_materials_updated_at ON ews_materials(updated_at);
-- Comments
COMMENT ON TABLE ews_materials IS 'Stores materials from EWS (Environmental Wall Systems) sheet with EPD data and carbon metrics';
COMMENT ON COLUMN ews_materials.assembly_code IS 'Assembly code (e.g., EWS-001, EWS-002)';
COMMENT ON COLUMN ews_materials.gwp IS 'Global Warming Potential in specified units';
COMMENT ON COLUMN ews_materials.msf_factor IS 'Material Safety Factor for calculations';