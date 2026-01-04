-- Migration: Add wave audit columns for tiered distribution
-- Created: 2026-01-04 12:00:00
-- Author: GreenChainz RFQ Distribution
-- 
-- Description:
-- Adds audit columns to RFQ_Distribution_Queue table to support tiered access
-- policy visibility in dashboards. These columns track:
-- - wave_reason: Why the supplier was assigned to this wave
-- - access_level: 'full' (Premium/Standard/Free) or 'outreach_only' (Shadow)
-- - tier_snapshot: Supplier's tier at time of distribution
--
-- Business Context:
-- The tiered wave distribution policy gives Premium suppliers immediate access,
-- Standard suppliers get 15-min delay, Free suppliers get 60-min delay, and
-- Shadow suppliers receive outreach/claim prompts only (no full RFQ listing).
-- Dashboard visibility into these decisions is required for monitoring.
--
-- Impact:
-- - Performance: Minimal - adding nullable columns with no backfill
-- - Storage: ~50-100 bytes per row
-- - Downtime: None required - all operations are non-blocking
-- - Dependencies: No external dependencies

-- ============================================
-- UP MIGRATION
-- ============================================

-- Step 1: Add wave_reason column (explains why supplier was assigned to this wave)
ALTER TABLE "RFQ_Distribution_Queue" 
ADD COLUMN IF NOT EXISTS wave_reason TEXT;

-- Step 2: Add access_level column (differentiates full access vs outreach only)
ALTER TABLE "RFQ_Distribution_Queue" 
ADD COLUMN IF NOT EXISTS access_level VARCHAR(50) DEFAULT 'full';

-- Step 3: Add tier_snapshot column (captures supplier tier at distribution time)
ALTER TABLE "RFQ_Distribution_Queue" 
ADD COLUMN IF NOT EXISTS tier_snapshot VARCHAR(50);

-- Step 4: Add constraint for access_level values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rfq_distribution_queue_access_level_check'
  ) THEN
    ALTER TABLE "RFQ_Distribution_Queue"
      ADD CONSTRAINT rfq_distribution_queue_access_level_check
      CHECK (access_level IN ('full', 'outreach_only'));
  END IF;
END $$;

-- Step 5: Create index for dashboard queries by access level
CREATE INDEX IF NOT EXISTS idx_rfq_dist_queue_access_level 
ON "RFQ_Distribution_Queue"(access_level);

-- Step 6: Create composite index for audit queries
CREATE INDEX IF NOT EXISTS idx_rfq_dist_queue_audit 
ON "RFQ_Distribution_Queue"(wave_number, access_level, tier_snapshot);

-- Step 7: Create index for shadow outreach processing
CREATE INDEX IF NOT EXISTS idx_rfq_dist_queue_shadow_pending
ON "RFQ_Distribution_Queue"(access_level, status, created_at)
WHERE access_level = 'outreach_only' AND status = 'pending';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================
-- Uncomment these lines to rollback this migration:
--
-- DROP INDEX IF EXISTS idx_rfq_dist_queue_shadow_pending;
-- DROP INDEX IF EXISTS idx_rfq_dist_queue_audit;
-- DROP INDEX IF EXISTS idx_rfq_dist_queue_access_level;
--
-- ALTER TABLE "RFQ_Distribution_Queue" DROP CONSTRAINT IF EXISTS rfq_distribution_queue_access_level_check;
--
-- ALTER TABLE "RFQ_Distribution_Queue" DROP COLUMN IF EXISTS tier_snapshot;
-- ALTER TABLE "RFQ_Distribution_Queue" DROP COLUMN IF EXISTS access_level;
-- ALTER TABLE "RFQ_Distribution_Queue" DROP COLUMN IF EXISTS wave_reason;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these queries after applying migration to verify success:
--
-- -- Check columns were added:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'RFQ_Distribution_Queue' 
--   AND column_name IN ('wave_reason', 'access_level', 'tier_snapshot');
--
-- -- Check indexes exist:
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'RFQ_Distribution_Queue' 
--   AND indexname LIKE 'idx_rfq_dist_queue_%';
--
-- -- Verify constraint exists:
-- SELECT conname, consrc FROM pg_constraint 
-- WHERE conname = 'rfq_distribution_queue_access_level_check';

-- ============================================
-- NOTES
-- ============================================
-- - This migration is idempotent and can be re-run safely
-- - New columns are nullable to avoid breaking existing data
-- - The access_level column defaults to 'full' for backwards compatibility
-- - Shadow suppliers use access_level = 'outreach_only'
-- - Dashboard queries should use the idx_rfq_dist_queue_audit index
