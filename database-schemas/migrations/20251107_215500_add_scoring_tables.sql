-- ============================================
-- Migration: Add Material Sustainability Scoring Tables
-- Created: 2025-11-07
-- Purpose: Persist computed sustainability + distance + LEED scores
--          for materials and suppliers. Supports explainable scoring
--          with "why recommended" breakdowns for UI.
-- ============================================

BEGIN;

-- ============================================
-- Material Sustainability Scores
-- Stores computed composite scores for products/suppliers
-- ============================================

CREATE TABLE IF NOT EXISTS material_sustainability_scores (
    id BIGSERIAL PRIMARY KEY,
    
    -- Entity identification (polymorphic: product or supplier)
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('product', 'supplier')),
    entity_id VARCHAR(255) NOT NULL,  -- UUID or BIGINT as string for flexibility
    
    -- Composite score (0-100)
    total_score INTEGER NOT NULL CHECK (total_score >= 0 AND total_score <= 100),
    
    -- Component scores (each weighted, sum = total_score)
    sustainability_score INTEGER DEFAULT 0 CHECK (sustainability_score >= 0 AND sustainability_score <= 100),
    distance_score INTEGER DEFAULT 0 CHECK (distance_score >= 0 AND distance_score <= 100),
    leed_score INTEGER DEFAULT 0 CHECK (leed_score >= 0 AND leed_score <= 100),
    
    -- Recommendation tier for quick filtering
    recommendation_tier VARCHAR(20) NOT NULL 
        CHECK (recommendation_tier IN ('excellent', 'good', 'average', 'low')),
    
    -- Full component breakdown (JSONB for flexibility)
    -- Structure: { sustainability: {...}, distance: {...}, leed: {...} }
    components JSONB,
    
    -- "Why Recommended" summary for UI display
    -- Structure: [{ reason, description, icon }, ...]
    why_recommended JSONB,
    
    -- Metadata
    calculated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Unique constraint on entity
    CONSTRAINT material_sustainability_scores_entity_unique 
        UNIQUE (entity_type, entity_id)
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- Primary query: get top scored entities
CREATE INDEX IF NOT EXISTS idx_mss_total_score 
    ON material_sustainability_scores(total_score DESC);

-- Filter by entity type + score
CREATE INDEX IF NOT EXISTS idx_mss_entity_type_score 
    ON material_sustainability_scores(entity_type, total_score DESC);

-- Filter by recommendation tier
CREATE INDEX IF NOT EXISTS idx_mss_recommendation_tier 
    ON material_sustainability_scores(recommendation_tier);

-- Lookup by entity
CREATE INDEX IF NOT EXISTS idx_mss_entity_lookup 
    ON material_sustainability_scores(entity_type, entity_id);

-- Dashboard: recent calculations
CREATE INDEX IF NOT EXISTS idx_mss_calculated_at 
    ON material_sustainability_scores(calculated_at DESC);

-- Component score queries
CREATE INDEX IF NOT EXISTS idx_mss_sustainability_score 
    ON material_sustainability_scores(sustainability_score DESC) 
    WHERE sustainability_score > 0;

CREATE INDEX IF NOT EXISTS idx_mss_leed_score 
    ON material_sustainability_scores(leed_score DESC) 
    WHERE leed_score > 0;

-- GIN index for JSONB queries on components
CREATE INDEX IF NOT EXISTS idx_mss_components_gin 
    ON material_sustainability_scores USING gin (components);

-- ============================================
-- Trigger for updated_at
-- ============================================

-- Create function if not exists
CREATE OR REPLACE FUNCTION update_mss_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mss_updated_at ON material_sustainability_scores;
CREATE TRIGGER trg_mss_updated_at
    BEFORE UPDATE ON material_sustainability_scores
    FOR EACH ROW EXECUTE FUNCTION update_mss_updated_at();

-- ============================================
-- Scoring History (Optional: for analytics)
-- ============================================

CREATE TABLE IF NOT EXISTS material_scoring_history (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('product', 'supplier')),
    entity_id VARCHAR(255) NOT NULL,
    total_score INTEGER NOT NULL,
    sustainability_score INTEGER DEFAULT 0,
    distance_score INTEGER DEFAULT 0,
    leed_score INTEGER DEFAULT 0,
    recommendation_tier VARCHAR(20) NOT NULL,
    calculated_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for history queries
CREATE INDEX IF NOT EXISTS idx_msh_entity_lookup 
    ON material_scoring_history(entity_type, entity_id, calculated_at DESC);

-- Partition by time for efficient cleanup (if using large history)
-- Note: Actual partitioning requires Postgres 11+ and is optional
CREATE INDEX IF NOT EXISTS idx_msh_calculated_at 
    ON material_scoring_history(calculated_at DESC);

-- ============================================
-- Helper Views
-- ============================================

-- View: Top recommended products with scores
CREATE OR REPLACE VIEW v_top_scored_products AS
SELECT 
    mss.entity_id AS product_id,
    mss.total_score,
    mss.sustainability_score,
    mss.distance_score,
    mss.leed_score,
    mss.recommendation_tier,
    mss.why_recommended,
    mss.calculated_at
FROM material_sustainability_scores mss
WHERE mss.entity_type = 'product'
ORDER BY mss.total_score DESC;

-- View: Top recommended suppliers with scores
CREATE OR REPLACE VIEW v_top_scored_suppliers AS
SELECT 
    mss.entity_id AS supplier_id,
    mss.total_score,
    mss.sustainability_score,
    mss.distance_score,
    mss.leed_score,
    mss.recommendation_tier,
    mss.why_recommended,
    mss.calculated_at
FROM material_sustainability_scores mss
WHERE mss.entity_type = 'supplier'
ORDER BY mss.total_score DESC;

-- View: Scoring distribution dashboard
CREATE OR REPLACE VIEW v_scoring_distribution AS
SELECT 
    entity_type,
    recommendation_tier,
    COUNT(*) AS count,
    ROUND(AVG(total_score), 1) AS avg_score,
    ROUND(AVG(sustainability_score), 1) AS avg_sustainability,
    ROUND(AVG(distance_score), 1) AS avg_distance,
    ROUND(AVG(leed_score), 1) AS avg_leed
FROM material_sustainability_scores
GROUP BY entity_type, recommendation_tier
ORDER BY entity_type, 
    CASE recommendation_tier 
        WHEN 'excellent' THEN 1 
        WHEN 'good' THEN 2 
        WHEN 'average' THEN 3 
        WHEN 'low' THEN 4 
    END;

-- ============================================
-- Function: Record score to history
-- ============================================

CREATE OR REPLACE FUNCTION record_score_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Only record if score changed significantly (>5 points) or first time
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND ABS(NEW.total_score - OLD.total_score) > 5) THEN
        INSERT INTO material_scoring_history (
            entity_type, entity_id, total_score, 
            sustainability_score, distance_score, leed_score,
            recommendation_tier, calculated_at
        ) VALUES (
            NEW.entity_type, NEW.entity_id, NEW.total_score,
            NEW.sustainability_score, NEW.distance_score, NEW.leed_score,
            NEW.recommendation_tier, NEW.calculated_at
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mss_record_history ON material_sustainability_scores;
CREATE TRIGGER trg_mss_record_history
    AFTER INSERT OR UPDATE ON material_sustainability_scores
    FOR EACH ROW EXECUTE FUNCTION record_score_history();

-- ============================================
-- Cleanup function for old history
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_scoring_history(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM material_scoring_history
    WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================
-- Rollback Script (run manually if needed)
-- ============================================
/*
BEGIN;
DROP VIEW IF EXISTS v_scoring_distribution;
DROP VIEW IF EXISTS v_top_scored_suppliers;
DROP VIEW IF EXISTS v_top_scored_products;
DROP FUNCTION IF EXISTS cleanup_old_scoring_history;
DROP TRIGGER IF EXISTS trg_mss_record_history ON material_sustainability_scores;
DROP FUNCTION IF EXISTS record_score_history;
DROP TRIGGER IF EXISTS trg_mss_updated_at ON material_sustainability_scores;
DROP FUNCTION IF EXISTS update_mss_updated_at;
DROP TABLE IF EXISTS material_scoring_history;
DROP TABLE IF EXISTS material_sustainability_scores;
COMMIT;
*/
