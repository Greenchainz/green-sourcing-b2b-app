-- Migration: Add Material Catalog Tables with Full-Text Search
-- Created: 2026-01-04 15:00:00
-- Author: Database Schema Agent
-- 
-- Description:
-- Creates the material catalog system including:
-- - material_categories: Hierarchical category tree for organizing materials
-- - materials: Core material records with sustainability scoring and full-text search
-- - material_certifications: Links materials to their certifications
-- - material_suppliers: Links materials to verified and shadow suppliers
-- Includes TSVECTOR for PostgreSQL full-text search and seeds 10 top-level categories.
--
-- Impact:
-- - Performance: Full-text search indexes for fast material lookups
-- - Storage: ~2KB per material with all related data
-- - Downtime: None - additive changes only
-- - Dependencies: Requires Suppliers, Certifications tables from core schema

-- ============================================
-- UP MIGRATION
-- ============================================

-- Step 1: Create material_categories table (hierarchical with parent_id)
CREATE TABLE IF NOT EXISTS material_categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    parent_id BIGINT REFERENCES material_categories(id) ON DELETE SET NULL,
    icon_name VARCHAR(100),  -- For UI icons (e.g., 'wood', 'metal', 'glass')
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    material_count INTEGER DEFAULT 0,  -- Denormalized for performance
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Step 2: Create materials table with sustainability scoring
CREATE TABLE IF NOT EXISTS materials (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    short_description VARCHAR(500),
    material_type VARCHAR(100) NOT NULL CHECK (material_type IN (
        'raw',           -- Raw materials (lumber, steel, etc.)
        'manufactured',  -- Manufactured products (windows, doors, etc.)
        'composite',     -- Composite materials
        'recycled',      -- Recycled materials
        'bio-based',     -- Bio-based materials
        'mineral',       -- Mineral-based materials
        'chemical'       -- Chemical/synthetic materials
    )),
    category_id BIGINT REFERENCES material_categories(id) ON DELETE SET NULL,
    
    -- Sustainability metrics
    sustainability_score INTEGER DEFAULT 0 CHECK (sustainability_score >= 0 AND sustainability_score <= 100),
    carbon_footprint_kg_m2 DECIMAL(10, 4),  -- kg CO2e per m²
    recycled_content_pct DECIMAL(5, 2) CHECK (recycled_content_pct >= 0 AND recycled_content_pct <= 100),
    recyclability_pct DECIMAL(5, 2) CHECK (recyclability_pct >= 0 AND recyclability_pct <= 100),
    voc_emissions VARCHAR(50),  -- Low/Medium/High or specific g/L value
    water_usage_l_kg DECIMAL(10, 2),  -- Liters per kg
    
    -- LEED/BREEAM eligibility
    leed_credits JSONB DEFAULT '[]'::jsonb,  -- Array of applicable LEED credits
    breeam_credits JSONB DEFAULT '[]'::jsonb,  -- Array of applicable BREEAM credits
    
    -- Images and media
    primary_image_url VARCHAR(500),
    image_urls JSONB DEFAULT '[]'::jsonb,
    datasheet_url VARCHAR(500),
    
    -- EC3 Integration (Building Transparency)
    ec3_material_id VARCHAR(255),
    ec3_data JSONB,
    ec3_last_synced_at TIMESTAMPTZ,
    
    -- Metadata
    specifications JSONB DEFAULT '{}'::jsonb,
    tags TEXT[],
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    view_count INTEGER DEFAULT 0,
    rfq_count INTEGER DEFAULT 0,
    
    -- Full-text search vector
    search_vector TSVECTOR,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Step 3: Create material_certifications linking table
CREATE TABLE IF NOT EXISTS material_certifications (
    id BIGSERIAL PRIMARY KEY,
    material_id BIGINT NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    certification_type VARCHAR(100) NOT NULL CHECK (certification_type IN (
        'fsc',              -- Forest Stewardship Council
        'pefc',             -- Programme for the Endorsement of Forest Certification
        'leed',             -- LEED certification
        'breeam',           -- BREEAM certification
        'greenguard',       -- GREENGUARD/UL certification
        'cradle_to_cradle', -- Cradle to Cradle
        'epd',              -- Environmental Product Declaration
        'declare',          -- Declare Label (Living Building Challenge)
        'energy_star',      -- ENERGY STAR
        'iso_14001',        -- ISO 14001 Environmental Management
        'iso_14025',        -- ISO 14025 EPD Standard
        'b_corp',           -- B Corp certification
        'eu_ecolabel',      -- EU Ecolabel
        'nordic_swan',      -- Nordic Swan Ecolabel
        'blue_angel',       -- Blue Angel (Germany)
        'other'             -- Other certifications
    )),
    certification_id BIGINT REFERENCES Certifications(CertificationID) ON DELETE SET NULL,
    certificate_number VARCHAR(255),
    certification_level VARCHAR(100),  -- e.g., 'Gold', 'Platinum', 'Silver'
    issuing_body VARCHAR(255),
    issue_date DATE,
    expiry_date DATE,
    document_url VARCHAR(500),
    verification_status VARCHAR(50) DEFAULT 'pending' CHECK (verification_status IN (
        'pending', 'verified', 'expired', 'revoked', 'failed'
    )),
    verified_at TIMESTAMPTZ,
    verified_by_user_id BIGINT REFERENCES Users(UserID) ON DELETE SET NULL,
    api_verified BOOLEAN DEFAULT FALSE,
    api_verification_data JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Prevent duplicate certifications
    CONSTRAINT material_cert_unique UNIQUE (material_id, certification_type, certificate_number)
);

-- Step 4: Create material_suppliers linking table
CREATE TABLE IF NOT EXISTS material_suppliers (
    id BIGSERIAL PRIMARY KEY,
    material_id BIGINT NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    supplier_id BIGINT REFERENCES Suppliers(SupplierID) ON DELETE CASCADE,
    shadow_supplier_id BIGINT,  -- References shadow_suppliers table if exists
    is_primary BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    
    -- Supplier-specific pricing (optional)
    unit_price DECIMAL(10, 2),
    currency VARCHAR(10) DEFAULT 'USD',
    min_order_quantity INTEGER,
    lead_time_days INTEGER,
    
    -- Geographic availability
    available_regions TEXT[],  -- Array of region codes
    
    -- Performance metrics
    rating DECIMAL(3, 2) CHECK (rating >= 0 AND rating <= 5),
    review_count INTEGER DEFAULT 0,
    rfq_response_rate DECIMAL(5, 2),  -- Percentage
    avg_response_time_hours INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Either supplier_id or shadow_supplier_id must be set
    CONSTRAINT material_supplier_has_supplier CHECK (
        supplier_id IS NOT NULL OR shadow_supplier_id IS NOT NULL
    ),
    -- Prevent duplicate supplier-material links
    CONSTRAINT material_supplier_unique UNIQUE (material_id, supplier_id, shadow_supplier_id)
);

-- Step 5: Create indexes for efficient queries

-- Category indexes
CREATE INDEX IF NOT EXISTS idx_material_categories_parent 
    ON material_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_material_categories_slug 
    ON material_categories(slug);
CREATE INDEX IF NOT EXISTS idx_material_categories_active 
    ON material_categories(is_active, sort_order);

-- Materials indexes
CREATE INDEX IF NOT EXISTS idx_materials_category 
    ON materials(category_id);
CREATE INDEX IF NOT EXISTS idx_materials_slug 
    ON materials(slug);
CREATE INDEX IF NOT EXISTS idx_materials_type 
    ON materials(material_type);
CREATE INDEX IF NOT EXISTS idx_materials_sustainability_score 
    ON materials(sustainability_score DESC);
CREATE INDEX IF NOT EXISTS idx_materials_featured 
    ON materials(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_materials_active 
    ON materials(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_materials_ec3 
    ON materials(ec3_material_id) WHERE ec3_material_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_materials_tags 
    ON materials USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_materials_leed_credits 
    ON materials USING gin(leed_credits);

-- Full-text search index (GIN for fast lookups)
CREATE INDEX IF NOT EXISTS idx_materials_search_vector 
    ON materials USING gin(search_vector);

-- Certification indexes
CREATE INDEX IF NOT EXISTS idx_material_certifications_material 
    ON material_certifications(material_id);
CREATE INDEX IF NOT EXISTS idx_material_certifications_type 
    ON material_certifications(certification_type);
CREATE INDEX IF NOT EXISTS idx_material_certifications_status 
    ON material_certifications(verification_status);
CREATE INDEX IF NOT EXISTS idx_material_certifications_expiry 
    ON material_certifications(expiry_date) WHERE expiry_date IS NOT NULL;

-- Supplier indexes
CREATE INDEX IF NOT EXISTS idx_material_suppliers_material 
    ON material_suppliers(material_id);
CREATE INDEX IF NOT EXISTS idx_material_suppliers_supplier 
    ON material_suppliers(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_material_suppliers_shadow 
    ON material_suppliers(shadow_supplier_id) WHERE shadow_supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_material_suppliers_primary 
    ON material_suppliers(material_id, is_primary) WHERE is_primary = TRUE;
CREATE INDEX IF NOT EXISTS idx_material_suppliers_verified 
    ON material_suppliers(is_verified) WHERE is_verified = TRUE;

-- Step 6: Create function to generate search vector
CREATE OR REPLACE FUNCTION materials_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.short_description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.material_type, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update search vector on insert/update
DROP TRIGGER IF EXISTS trg_materials_search_vector ON materials;
CREATE TRIGGER trg_materials_search_vector
    BEFORE INSERT OR UPDATE OF name, short_description, description, material_type, tags
    ON materials
    FOR EACH ROW
    EXECUTE FUNCTION materials_search_vector_update();

-- Step 7: Create updated_at triggers
CREATE OR REPLACE FUNCTION update_catalog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_material_categories_updated_at ON material_categories;
CREATE TRIGGER trg_material_categories_updated_at
    BEFORE UPDATE ON material_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_catalog_updated_at();

DROP TRIGGER IF EXISTS trg_materials_updated_at ON materials;
CREATE TRIGGER trg_materials_updated_at
    BEFORE UPDATE ON materials
    FOR EACH ROW
    EXECUTE FUNCTION update_catalog_updated_at();

DROP TRIGGER IF EXISTS trg_material_certifications_updated_at ON material_certifications;
CREATE TRIGGER trg_material_certifications_updated_at
    BEFORE UPDATE ON material_certifications
    FOR EACH ROW
    EXECUTE FUNCTION update_catalog_updated_at();

DROP TRIGGER IF EXISTS trg_material_suppliers_updated_at ON material_suppliers;
CREATE TRIGGER trg_material_suppliers_updated_at
    BEFORE UPDATE ON material_suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_catalog_updated_at();

-- Step 8: Create trigger to update category material counts
CREATE OR REPLACE FUNCTION update_category_material_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE material_categories 
        SET material_count = material_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.category_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE material_categories 
        SET material_count = material_count - 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.category_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.category_id IS DISTINCT FROM NEW.category_id THEN
        UPDATE material_categories 
        SET material_count = material_count - 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.category_id;
        UPDATE material_categories 
        SET material_count = material_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.category_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_category_material_count ON materials;
CREATE TRIGGER trg_update_category_material_count
    AFTER INSERT OR UPDATE OF category_id OR DELETE
    ON materials
    FOR EACH ROW
    EXECUTE FUNCTION update_category_material_count();

-- Step 9: Seed 10 top-level material categories (construction/building materials)
INSERT INTO material_categories (name, slug, description, icon_name, sort_order) VALUES
    ('Wood & Timber', 'wood-timber', 'Lumber, engineered wood, and timber products including FSC-certified options', 'wood', 1),
    ('Concrete & Masonry', 'concrete-masonry', 'Concrete, cement, bricks, blocks, and masonry materials with low-carbon alternatives', 'concrete', 2),
    ('Steel & Metals', 'steel-metals', 'Structural steel, aluminum, copper, and other metal products including recycled options', 'metal', 3),
    ('Glass & Glazing', 'glass-glazing', 'Windows, curtain walls, glass panels, and glazing systems with energy-efficient ratings', 'glass', 4),
    ('Insulation', 'insulation', 'Thermal and acoustic insulation including natural, mineral, and foam-based products', 'insulation', 5),
    ('Roofing', 'roofing', 'Roofing membranes, shingles, tiles, and green roof systems', 'roof', 6),
    ('Flooring', 'flooring', 'Flooring materials including hardwood, tile, carpet, and sustainable alternatives', 'flooring', 7),
    ('Wall Systems', 'wall-systems', 'Drywall, panels, cladding, and interior/exterior wall materials', 'wall', 8),
    ('Paints & Coatings', 'paints-coatings', 'Low-VOC paints, stains, sealants, and protective coatings', 'paint', 9),
    ('Plumbing & HVAC', 'plumbing-hvac', 'Pipes, fixtures, HVAC equipment, and water-efficient products', 'plumbing', 10)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon_name = EXCLUDED.icon_name,
    sort_order = EXCLUDED.sort_order,
    updated_at = CURRENT_TIMESTAMP;

-- Step 10: Add helpful comments
COMMENT ON TABLE material_categories IS 'Hierarchical category tree for organizing materials (Sweets-like navigation)';
COMMENT ON COLUMN material_categories.parent_id IS 'Self-referencing FK for subcategories; NULL = top-level';
COMMENT ON COLUMN material_categories.material_count IS 'Denormalized count updated via trigger';

COMMENT ON TABLE materials IS 'Core material catalog with sustainability metrics and full-text search';
COMMENT ON COLUMN materials.sustainability_score IS 'Composite score 0-100 based on certifications, carbon footprint, recyclability';
COMMENT ON COLUMN materials.search_vector IS 'TSVECTOR for PostgreSQL full-text search; auto-updated via trigger';
COMMENT ON COLUMN materials.ec3_material_id IS 'Building Transparency EC3 database material ID for carbon data';
COMMENT ON COLUMN materials.leed_credits IS 'JSONB array of applicable LEED credits e.g. ["MR Credit 4", "EQ Credit 2"]';

COMMENT ON TABLE material_certifications IS 'Links materials to environmental certifications (FSC, EPD, LEED, etc.)';
COMMENT ON COLUMN material_certifications.certification_type IS 'Type of certification from supported list';
COMMENT ON COLUMN material_certifications.api_verified IS 'TRUE if verified via external API (FSC, B Corp, etc.)';

COMMENT ON TABLE material_suppliers IS 'Links materials to verified suppliers and shadow suppliers';
COMMENT ON COLUMN material_suppliers.shadow_supplier_id IS 'Reference to shadow_suppliers table for unclaimed suppliers';
COMMENT ON COLUMN material_suppliers.is_primary IS 'TRUE for the primary/featured supplier for this material';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================
-- Uncomment these lines to rollback this migration:
--
-- -- Rollback Step 10: Remove comments (optional)
--
-- -- Rollback Step 9: Remove seeded categories
-- DELETE FROM material_categories WHERE slug IN (
--     'wood-timber', 'concrete-masonry', 'steel-metals', 'glass-glazing',
--     'insulation', 'roofing', 'flooring', 'wall-systems', 'paints-coatings', 'plumbing-hvac'
-- );
--
-- -- Rollback Step 8: Drop category count trigger
-- DROP TRIGGER IF EXISTS trg_update_category_material_count ON materials;
-- DROP FUNCTION IF EXISTS update_category_material_count();
--
-- -- Rollback Step 7: Drop updated_at triggers
-- DROP TRIGGER IF EXISTS trg_material_suppliers_updated_at ON material_suppliers;
-- DROP TRIGGER IF EXISTS trg_material_certifications_updated_at ON material_certifications;
-- DROP TRIGGER IF EXISTS trg_materials_updated_at ON materials;
-- DROP TRIGGER IF EXISTS trg_material_categories_updated_at ON material_categories;
-- DROP FUNCTION IF EXISTS update_catalog_updated_at();
--
-- -- Rollback Step 6: Drop search vector trigger
-- DROP TRIGGER IF EXISTS trg_materials_search_vector ON materials;
-- DROP FUNCTION IF EXISTS materials_search_vector_update();
--
-- -- Rollback Step 5: Drop indexes
-- DROP INDEX IF EXISTS idx_material_suppliers_verified;
-- DROP INDEX IF EXISTS idx_material_suppliers_primary;
-- DROP INDEX IF EXISTS idx_material_suppliers_shadow;
-- DROP INDEX IF EXISTS idx_material_suppliers_supplier;
-- DROP INDEX IF EXISTS idx_material_suppliers_material;
-- DROP INDEX IF EXISTS idx_material_certifications_expiry;
-- DROP INDEX IF EXISTS idx_material_certifications_status;
-- DROP INDEX IF EXISTS idx_material_certifications_type;
-- DROP INDEX IF EXISTS idx_material_certifications_material;
-- DROP INDEX IF EXISTS idx_materials_search_vector;
-- DROP INDEX IF EXISTS idx_materials_leed_credits;
-- DROP INDEX IF EXISTS idx_materials_tags;
-- DROP INDEX IF EXISTS idx_materials_ec3;
-- DROP INDEX IF EXISTS idx_materials_active;
-- DROP INDEX IF EXISTS idx_materials_featured;
-- DROP INDEX IF EXISTS idx_materials_sustainability_score;
-- DROP INDEX IF EXISTS idx_materials_type;
-- DROP INDEX IF EXISTS idx_materials_slug;
-- DROP INDEX IF EXISTS idx_materials_category;
-- DROP INDEX IF EXISTS idx_material_categories_active;
-- DROP INDEX IF EXISTS idx_material_categories_slug;
-- DROP INDEX IF EXISTS idx_material_categories_parent;
--
-- -- Rollback Step 4: Drop material_suppliers table
-- DROP TABLE IF EXISTS material_suppliers;
--
-- -- Rollback Step 3: Drop material_certifications table
-- DROP TABLE IF EXISTS material_certifications;
--
-- -- Rollback Step 2: Drop materials table
-- DROP TABLE IF EXISTS materials;
--
-- -- Rollback Step 1: Drop material_categories table
-- DROP TABLE IF EXISTS material_categories;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these queries after applying migration to verify success:
--
-- -- Check all tables were created:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_name IN ('material_categories', 'materials', 'material_certifications', 'material_suppliers');
--
-- -- Check seeded categories (should return 10):
-- SELECT COUNT(*) as category_count FROM material_categories WHERE parent_id IS NULL;
-- SELECT name, slug, sort_order FROM material_categories ORDER BY sort_order;
--
-- -- Check search vector trigger works:
-- INSERT INTO materials (name, slug, material_type, description) 
-- VALUES ('Test FSC Lumber', 'test-fsc-lumber', 'raw', 'Certified sustainable lumber');
-- SELECT name, search_vector FROM materials WHERE slug = 'test-fsc-lumber';
-- DELETE FROM materials WHERE slug = 'test-fsc-lumber';
--
-- -- Check full-text search:
-- INSERT INTO materials (name, slug, material_type, description, tags) 
-- VALUES ('Test Search Material', 'test-search', 'raw', 'Sustainable wood product', ARRAY['fsc', 'green']);
-- SELECT name FROM materials WHERE search_vector @@ to_tsquery('english', 'sustainable & wood');
-- DELETE FROM materials WHERE slug = 'test-search';
--
-- -- Check indexes:
-- SELECT indexname FROM pg_indexes WHERE tablename = 'materials';

-- ============================================
-- NOTES
-- ============================================
-- - The search_vector is automatically updated via trigger when name/description/tags change
-- - Category material_count is automatically maintained via trigger
-- - Consider adding a scheduled job to sync EC3 data for materials with ec3_material_id
-- - The 10 seeded categories match common construction material classifications
-- - Use plainto_tsquery for user search input, to_tsquery for structured queries
-- - For ranking search results: ts_rank(search_vector, query) ORDER BY rank DESC
