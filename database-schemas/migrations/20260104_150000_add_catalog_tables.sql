-- Migration: Add Catalog Tables for Sweets-like Material Catalog
-- Created: 2026-01-04 15:00:00
-- Author: GreenChainz DB-SCHEMA Agent
-- 
-- Description:
-- Creates the material catalog system with categories, certifications,
-- and supplier linkage. Supports both claimed suppliers (full visibility)
-- and shadow suppliers (anonymous in catalog, revealed on claim).
--
-- Impact:
-- - Performance: Full-text search index, category tree queries
-- - Storage: ~1KB per material
-- - Downtime: None - additive changes only

-- ============================================
-- UP MIGRATION
-- ============================================

-- Step 1: Create Material Categories table (hierarchical)
CREATE TABLE IF NOT EXISTS material_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    parent_id UUID REFERENCES material_categories(id) ON DELETE SET NULL,
    description TEXT,
    icon VARCHAR(100),
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    material_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE material_categories IS 'Hierarchical categories for material catalog (Wood, Insulation, Concrete, etc.)';

-- Create index for hierarchical queries
CREATE INDEX IF NOT EXISTS idx_material_categories_parent ON material_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_material_categories_slug ON material_categories(slug);
CREATE INDEX IF NOT EXISTS idx_material_categories_active ON material_categories(is_active) WHERE is_active = TRUE;

-- Step 2: Create Materials table (central catalog)
CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    material_type VARCHAR(100),
    category_id UUID REFERENCES material_categories(id) ON DELETE SET NULL,
    
    -- Sustainability metrics (pre-calculated for performance)
    sustainability_score INTEGER DEFAULT 0 CHECK (sustainability_score >= 0 AND sustainability_score <= 100),
    carbon_footprint_kg DECIMAL(10,4),
    carbon_footprint_unit VARCHAR(50) DEFAULT 'kg CO2e/unit',
    leed_points_potential INTEGER DEFAULT 0,
    
    -- EPD data (if available)
    epd_number VARCHAR(100),
    epd_url TEXT,
    epd_expiry DATE,
    gwp_value DECIMAL(10,4),
    gwp_unit VARCHAR(50),
    
    -- Product info
    manufacturer VARCHAR(255),
    country_of_origin VARCHAR(100),
    
    -- Search optimization (auto-updated by trigger)
    search_vector TSVECTOR,
    
    -- Media
    image_urls JSONB DEFAULT '[]'::jsonb,
    thumbnail_url TEXT,
    
    -- Specifications
    specs JSONB DEFAULT '{}'::jsonb,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE materials IS 'Central material catalog with sustainability metrics and search';

-- Step 3: Create Material Certifications junction table
CREATE TABLE IF NOT EXISTS material_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    
    -- Certification info
    certification_type VARCHAR(50) NOT NULL CHECK (certification_type IN (
        'FSC', 'PEFC', 'EPD', 'HPD', 'LEED', 'C2C', 'GREENGUARD', 
        'DECLARE', 'LIVING_PRODUCT', 'ENERGY_STAR', 'WELL', 'BREEAM', 'OTHER'
    )),
    certification_id VARCHAR(255),
    certification_url TEXT,
    issuing_body VARCHAR(255),
    
    -- Validity
    issued_date DATE,
    expiry_date DATE,
    verified_at TIMESTAMP,
    verified_by VARCHAR(100), -- 'system', 'manual', 'api'
    
    -- LEED contribution (if applicable)
    leed_credit VARCHAR(50),
    leed_points DECIMAL(3,1),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint per material per certification type
    CONSTRAINT unique_material_certification UNIQUE (material_id, certification_type, certification_id)
);

COMMENT ON TABLE material_certifications IS 'Certifications linked to materials (FSC, EPD, LEED credits, etc.)';

-- Step 4: Create Material Suppliers junction table
-- Links materials to both claimed (suppliers) and shadow (scraped_supplier_data) suppliers
CREATE TABLE IF NOT EXISTS material_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    
    -- Link to claimed supplier OR shadow supplier (mutually exclusive)
    supplier_id UUID, -- References suppliers(id) - claimed supplier
    shadow_supplier_id UUID, -- References scraped_supplier_data(id) - shadow supplier
    
    -- Supplier relationship
    is_primary BOOLEAN DEFAULT FALSE,
    is_manufacturer BOOLEAN DEFAULT FALSE,
    is_distributor BOOLEAN DEFAULT FALSE,
    
    -- Pricing info (optional, shown to verified buyers)
    price_min DECIMAL(12,2),
    price_max DECIMAL(12,2),
    price_unit VARCHAR(50),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Lead time
    lead_time_days_min INTEGER,
    lead_time_days_max INTEGER,
    
    -- Geographic availability
    regions_served JSONB DEFAULT '[]'::jsonb,
    ships_internationally BOOLEAN DEFAULT TRUE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    verified_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Must have either supplier_id OR shadow_supplier_id
    CONSTRAINT material_supplier_link CHECK (
        (supplier_id IS NOT NULL AND shadow_supplier_id IS NULL) OR
        (supplier_id IS NULL AND shadow_supplier_id IS NOT NULL)
    )
);

COMMENT ON TABLE material_suppliers IS 'Links materials to suppliers (claimed) and shadow suppliers (anonymous)';

-- Step 5: Create indexes for catalog queries
-- Materials indexes
CREATE INDEX IF NOT EXISTS idx_materials_search ON materials USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category_id);
CREATE INDEX IF NOT EXISTS idx_materials_score ON materials(sustainability_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_materials_featured ON materials(is_featured, sustainability_score DESC) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_materials_active ON materials(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_materials_slug ON materials(slug);
CREATE INDEX IF NOT EXISTS idx_materials_type ON materials(material_type);

-- Material certifications indexes
CREATE INDEX IF NOT EXISTS idx_material_certifications_material ON material_certifications(material_id);
CREATE INDEX IF NOT EXISTS idx_material_certifications_type ON material_certifications(certification_type);
CREATE INDEX IF NOT EXISTS idx_material_certifications_valid ON material_certifications(material_id) 
    WHERE expiry_date IS NULL OR expiry_date > CURRENT_DATE;

-- Material suppliers indexes
CREATE INDEX IF NOT EXISTS idx_material_suppliers_material ON material_suppliers(material_id);
CREATE INDEX IF NOT EXISTS idx_material_suppliers_supplier ON material_suppliers(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_material_suppliers_shadow ON material_suppliers(shadow_supplier_id) WHERE shadow_supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_material_suppliers_primary ON material_suppliers(material_id, is_primary) WHERE is_primary = TRUE;
CREATE INDEX IF NOT EXISTS idx_material_suppliers_active ON material_suppliers(material_id) WHERE is_active = TRUE;

-- Step 6: Create full-text search vector update trigger
CREATE OR REPLACE FUNCTION update_material_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.short_description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.material_type, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.manufacturer, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_materials_search_update ON materials;
CREATE TRIGGER trg_materials_search_update
    BEFORE INSERT OR UPDATE OF name, description, short_description, material_type, manufacturer
    ON materials
    FOR EACH ROW EXECUTE FUNCTION update_material_search_vector();

-- Step 7: Create timestamp update triggers
CREATE OR REPLACE FUNCTION update_materials_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_materials_updated ON materials;
CREATE TRIGGER trg_materials_updated
    BEFORE UPDATE ON materials
    FOR EACH ROW EXECUTE FUNCTION update_materials_timestamp();

DROP TRIGGER IF EXISTS trg_material_categories_updated ON material_categories;
CREATE TRIGGER trg_material_categories_updated
    BEFORE UPDATE ON material_categories
    FOR EACH ROW EXECUTE FUNCTION update_materials_timestamp();

DROP TRIGGER IF EXISTS trg_material_suppliers_updated ON material_suppliers;
CREATE TRIGGER trg_material_suppliers_updated
    BEFORE UPDATE ON material_suppliers
    FOR EACH ROW EXECUTE FUNCTION update_materials_timestamp();

-- Step 8: Create helper function to get material with supplier counts
CREATE OR REPLACE FUNCTION get_material_with_suppliers(p_material_id UUID)
RETURNS TABLE (
    material_id UUID,
    material_name VARCHAR,
    sustainability_score INTEGER,
    verified_supplier_count BIGINT,
    shadow_supplier_count BIGINT,
    certifications JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id AS material_id,
        m.name AS material_name,
        m.sustainability_score,
        COUNT(ms.id) FILTER (WHERE ms.supplier_id IS NOT NULL) AS verified_supplier_count,
        COUNT(ms.id) FILTER (WHERE ms.shadow_supplier_id IS NOT NULL) AS shadow_supplier_count,
        COALESCE(
            (SELECT jsonb_agg(jsonb_build_object(
                'type', mc.certification_type,
                'id', mc.certification_id,
                'leed_points', mc.leed_points
            ))
            FROM material_certifications mc
            WHERE mc.material_id = m.id),
            '[]'::jsonb
        ) AS certifications
    FROM materials m
    LEFT JOIN material_suppliers ms ON m.id = ms.material_id AND ms.is_active = TRUE
    WHERE m.id = p_material_id
    GROUP BY m.id, m.name, m.sustainability_score;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create function to update category material counts
CREATE OR REPLACE FUNCTION update_category_material_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update old category count (on update/delete)
    IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.category_id IS NOT NULL THEN
        UPDATE material_categories 
        SET material_count = (
            SELECT COUNT(*) FROM materials 
            WHERE category_id = OLD.category_id AND is_active = TRUE
        )
        WHERE id = OLD.category_id;
    END IF;
    
    -- Update new category count (on insert/update)
    IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.category_id IS NOT NULL THEN
        UPDATE material_categories 
        SET material_count = (
            SELECT COUNT(*) FROM materials 
            WHERE category_id = NEW.category_id AND is_active = TRUE
        )
        WHERE id = NEW.category_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_category_count ON materials;
CREATE TRIGGER trg_update_category_count
    AFTER INSERT OR UPDATE OF category_id, is_active OR DELETE
    ON materials
    FOR EACH ROW EXECUTE FUNCTION update_category_material_count();

-- ============================================
-- SEED DATA: Initial Categories
-- ============================================

INSERT INTO material_categories (name, slug, description, icon, sort_order) VALUES
    ('Wood & Lumber', 'wood-lumber', 'Sustainable wood products including FSC-certified lumber', '🪵', 1),
    ('Insulation', 'insulation', 'Thermal and acoustic insulation materials', '🧱', 2),
    ('Concrete & Masonry', 'concrete-masonry', 'Concrete, cement, and masonry products', '🏗️', 3),
    ('Metals', 'metals', 'Steel, aluminum, and other metal products', '🔩', 4),
    ('Glass & Glazing', 'glass-glazing', 'Glass panels, windows, and glazing systems', '🪟', 5),
    ('Flooring', 'flooring', 'Sustainable flooring options', '🏠', 6),
    ('Roofing', 'roofing', 'Roofing materials and systems', '🏘️', 7),
    ('Paints & Coatings', 'paints-coatings', 'Low-VOC paints and sustainable coatings', '🎨', 8),
    ('Plumbing', 'plumbing', 'Water-efficient plumbing fixtures', '🚿', 9),
    ('HVAC', 'hvac', 'Energy-efficient HVAC systems', '❄️', 10)
ON CONFLICT (slug) DO NOTHING;

-- Add subcategories
INSERT INTO material_categories (name, slug, parent_id, description, sort_order) 
SELECT 'FSC Certified', 'fsc-certified', id, 'Forest Stewardship Council certified wood', 1
FROM material_categories WHERE slug = 'wood-lumber'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO material_categories (name, slug, parent_id, description, sort_order) 
SELECT 'Reclaimed Wood', 'reclaimed-wood', id, 'Reclaimed and salvaged wood products', 2
FROM material_categories WHERE slug = 'wood-lumber'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO material_categories (name, slug, parent_id, description, sort_order) 
SELECT 'Engineered Wood', 'engineered-wood', id, 'CLT, LVL, and other engineered wood products', 3
FROM material_categories WHERE slug = 'wood-lumber'
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================
-- Uncomment these lines to rollback this migration:
--
-- DROP TRIGGER IF EXISTS trg_update_category_count ON materials;
-- DROP FUNCTION IF EXISTS update_category_material_count();
-- DROP FUNCTION IF EXISTS get_material_with_suppliers(UUID);
-- DROP TRIGGER IF EXISTS trg_material_suppliers_updated ON material_suppliers;
-- DROP TRIGGER IF EXISTS trg_material_categories_updated ON material_categories;
-- DROP TRIGGER IF EXISTS trg_materials_updated ON materials;
-- DROP FUNCTION IF EXISTS update_materials_timestamp();
-- DROP TRIGGER IF EXISTS trg_materials_search_update ON materials;
-- DROP FUNCTION IF EXISTS update_material_search_vector();
-- DROP INDEX IF EXISTS idx_material_suppliers_active;
-- DROP INDEX IF EXISTS idx_material_suppliers_primary;
-- DROP INDEX IF EXISTS idx_material_suppliers_shadow;
-- DROP INDEX IF EXISTS idx_material_suppliers_supplier;
-- DROP INDEX IF EXISTS idx_material_suppliers_material;
-- DROP INDEX IF EXISTS idx_material_certifications_valid;
-- DROP INDEX IF EXISTS idx_material_certifications_type;
-- DROP INDEX IF EXISTS idx_material_certifications_material;
-- DROP INDEX IF EXISTS idx_materials_type;
-- DROP INDEX IF EXISTS idx_materials_slug;
-- DROP INDEX IF EXISTS idx_materials_active;
-- DROP INDEX IF EXISTS idx_materials_featured;
-- DROP INDEX IF EXISTS idx_materials_score;
-- DROP INDEX IF EXISTS idx_materials_category;
-- DROP INDEX IF EXISTS idx_materials_search;
-- DROP INDEX IF EXISTS idx_material_categories_active;
-- DROP INDEX IF EXISTS idx_material_categories_slug;
-- DROP INDEX IF EXISTS idx_material_categories_parent;
-- DROP TABLE IF EXISTS material_suppliers;
-- DROP TABLE IF EXISTS material_certifications;
-- DROP TABLE IF EXISTS materials;
-- DROP TABLE IF EXISTS material_categories;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run after applying:
-- SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'material%';
-- SELECT COUNT(*) FROM material_categories;
-- SELECT proname FROM pg_proc WHERE proname LIKE '%material%';
