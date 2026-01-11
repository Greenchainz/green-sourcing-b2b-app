-- Migration: Add Location Coordinates
-- Created: 2026-01-08 13:00:00
-- Author: GreenChainz Team
-- 
-- Description:
-- Adds latitude and longitude columns to Companies and rfqs tables
-- to enable distance-based supplier matching. These coordinates are
-- used by the RFQ matcher service to calculate distances between
-- suppliers and project locations.

-- ============================================
-- UP MIGRATION
-- ============================================

-- Add latitude/longitude to Companies table (for supplier locations)
ALTER TABLE Companies 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add index for location-based queries
CREATE INDEX IF NOT EXISTS idx_companies_location ON Companies(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add latitude/longitude to rfqs table (for project locations)
ALTER TABLE rfqs 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add index for location-based queries
CREATE INDEX IF NOT EXISTS idx_rfqs_location ON rfqs(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN Companies.latitude IS 'Latitude coordinate for supplier location (decimal degrees, -90 to 90)';
COMMENT ON COLUMN Companies.longitude IS 'Longitude coordinate for supplier location (decimal degrees, -180 to 180)';
COMMENT ON COLUMN rfqs.latitude IS 'Latitude coordinate for project location (decimal degrees, -90 to 90)';
COMMENT ON COLUMN rfqs.longitude IS 'Longitude coordinate for project location (decimal degrees, -180 to 180)';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================
-- Uncomment these lines to rollback:
--
-- DROP INDEX IF EXISTS idx_rfqs_location;
-- DROP INDEX IF EXISTS idx_companies_location;
-- ALTER TABLE rfqs DROP COLUMN IF EXISTS longitude;
-- ALTER TABLE rfqs DROP COLUMN IF EXISTS latitude;
-- ALTER TABLE Companies DROP COLUMN IF EXISTS longitude;
-- ALTER TABLE Companies DROP COLUMN IF EXISTS latitude;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these queries after migration to verify success:
--
-- Check Companies columns:
-- SELECT column_name, data_type, numeric_precision, numeric_scale 
-- FROM information_schema.columns 
-- WHERE table_name = 'Companies' AND column_name IN ('latitude', 'longitude');
--
-- Check rfqs columns:
-- SELECT column_name, data_type, numeric_precision, numeric_scale 
-- FROM information_schema.columns 
-- WHERE table_name = 'rfqs' AND column_name IN ('latitude', 'longitude');
--
-- Check indexes:
-- SELECT indexname FROM pg_indexes 
-- WHERE tablename IN ('Companies', 'rfqs') 
-- AND indexname LIKE '%location%';
