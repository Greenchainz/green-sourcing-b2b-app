-- Migration: Add Decision Maker Attributes to Users Table
-- Created: 2026-01-11 23:00:00
-- Author: GreenChainz Platform
-- 
-- Description:
-- Adds Decision Maker persona attributes to the Users table for Intercom integration.
-- These attributes enable role-based messaging and contextual conversations.
-- 
-- New columns:
-- - DecisionLayer: User's role in decision-making (e.g., "Financial Gatekeeper", "Design Lead")
-- - PrimaryMotivation: Key motivation metric (e.g., "ROI/NPV", "Aesthetics")
-- - PriorityLevel: Sustainability approach (e.g., "Data-driven", "Brand-led")
-- - JobTitle: User's job title for role mapping
-- - RFQCount: Number of active RFQs (for context in support)
-- 
-- Impact:
-- - Performance: Minimal - indexed for Intercom queries
-- - Storage: ~100 bytes per user
-- - Downtime: None - additive changes only
-- - Dependencies: Users table must exist

-- ============================================
-- UP MIGRATION
-- ============================================

-- Add Decision Maker attributes
ALTER TABLE Users ADD COLUMN IF NOT EXISTS DecisionLayer VARCHAR(100);
ALTER TABLE Users ADD COLUMN IF NOT EXISTS PrimaryMotivation VARCHAR(100);
ALTER TABLE Users ADD COLUMN IF NOT EXISTS PriorityLevel VARCHAR(100);
ALTER TABLE Users ADD COLUMN IF NOT EXISTS JobTitle VARCHAR(100);
ALTER TABLE Users ADD COLUMN IF NOT EXISTS RFQCount INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN Users.DecisionLayer IS 'Decision maker layer: Financial Gatekeeper, Design Lead, Sustainability Officer, etc.';
COMMENT ON COLUMN Users.PrimaryMotivation IS 'Primary decision metric: ROI/NPV, Aesthetics, Carbon Footprint, etc.';
COMMENT ON COLUMN Users.PriorityLevel IS 'Sustainability approach: Data-driven, Brand-led, Compliance-driven';
COMMENT ON COLUMN Users.JobTitle IS 'Job title for role-based persona mapping';
COMMENT ON COLUMN Users.RFQCount IS 'Number of active RFQs (cached for Intercom context)';

-- Create index for Intercom queries
CREATE INDEX IF NOT EXISTS idx_users_decision_layer ON Users(DecisionLayer);
CREATE INDEX IF NOT EXISTS idx_users_job_title ON Users(JobTitle);

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================
-- Uncomment these lines to rollback this migration:
--
-- DROP INDEX IF EXISTS idx_users_job_title;
-- DROP INDEX IF EXISTS idx_users_decision_layer;
-- ALTER TABLE Users DROP COLUMN IF EXISTS RFQCount;
-- ALTER TABLE Users DROP COLUMN IF EXISTS JobTitle;
-- ALTER TABLE Users DROP COLUMN IF EXISTS PriorityLevel;
-- ALTER TABLE Users DROP COLUMN IF EXISTS PrimaryMotivation;
-- ALTER TABLE Users DROP COLUMN IF EXISTS DecisionLayer;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these queries after applying migration to verify success:
--
-- -- Check columns exist:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'users'
-- AND column_name IN ('decisionlayer', 'primarymotivation', 'prioritylevel', 'jobtitle', 'rfqcount');
--
-- -- Check indexes exist:
-- SELECT indexname FROM pg_indexes
-- WHERE tablename = 'users'
-- AND indexname IN ('idx_users_decision_layer', 'idx_users_job_title');
