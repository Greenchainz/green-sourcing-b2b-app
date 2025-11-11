-- Migration: [Brief description - max 50 characters]
-- Created: YYYY-MM-DD HH:MM:SS
-- Author: [Your name]
-- 
-- Description:
-- [Detailed explanation of what this migration does and why it's needed.
-- Include business context, technical rationale, and any dependencies.
-- Link to related GitHub issues, Jira tickets, or design documents.]
--
-- Impact:
-- - [Performance: Expected query time improvements]
-- - [Storage: Estimated disk space impact]
-- - [Downtime: Whether this requires maintenance window]
-- - [Dependencies: Other migrations or services that must be updated]

-- ============================================
-- UP MIGRATION
-- ============================================

-- [Step 1: Description]
-- Example: Add new column for tracking feature flags
ALTER TABLE Users ADD COLUMN IF NOT EXISTS FeatureFlags JSONB DEFAULT '{}'::jsonb;

-- [Step 2: Description]
-- Example: Create index for efficient feature flag lookups
CREATE INDEX IF NOT EXISTS idx_users_feature_flags ON Users USING gin (FeatureFlags);

-- [Step 3: Description]
-- Example: Backfill default values for existing rows
UPDATE Users SET FeatureFlags = '{"beta_access": false}'::jsonb WHERE FeatureFlags IS NULL OR FeatureFlags = '{}'::jsonb;

-- [Add more steps as needed]

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================
-- Uncomment these lines to rollback this migration:
--
-- -- Rollback Step 3: Remove backfilled data (optional)
-- -- UPDATE Users SET FeatureFlags = '{}'::jsonb;
--
-- -- Rollback Step 2: Drop index
-- DROP INDEX IF EXISTS idx_users_feature_flags;
--
-- -- Rollback Step 1: Drop column
-- ALTER TABLE Users DROP COLUMN IF EXISTS FeatureFlags;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these queries after applying migration to verify success:
--
-- -- Check column was added:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' AND column_name = 'featureflags';
--
-- -- Check index exists:
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'users' AND indexname = 'idx_users_feature_flags';
--
-- -- Verify data integrity:
-- SELECT COUNT(*) FROM Users WHERE FeatureFlags IS NULL;
-- -- (Expected: 0 if backfill was successful)
--
-- -- Test query performance:
-- EXPLAIN ANALYZE SELECT * FROM Users WHERE FeatureFlags @> '{"beta_access": true}'::jsonb;

-- ============================================
-- NOTES
-- ============================================
-- [Add any additional notes, warnings, or follow-up tasks here]
-- 
-- Example notes:
-- - This migration must run during low-traffic window (< 100 QPS)
-- - After applying, update API documentation for new feature flag fields
-- - Monitor index size growth over next 7 days
-- - Schedule cleanup of deprecated columns in 30 days
