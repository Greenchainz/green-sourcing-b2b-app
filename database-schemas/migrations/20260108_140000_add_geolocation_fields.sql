-- Migration: Add Geolocation Fields
-- Created: 2026-01-08 14:00:00
-- Author: GreenChainz Team
-- 
-- Description:
-- Adds location fields to users (suppliers) and creates rfq_supplier_matches
-- table for distance-based supplier matching. This enables architects to
-- find LOCAL verified suppliers based on proximity.
-- ============================================
-- UP MIGRATION
-- ============================================
-- Add location fields to users (suppliers)
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
-- Add location fields to rfqs (if not already added)
ALTER TABLE rfqs
ADD COLUMN IF NOT EXISTS project_latitude DECIMAL(10, 8);
ALTER TABLE rfqs
ADD COLUMN IF NOT EXISTS project_longitude DECIMAL(11, 8);
-- Create rfq_supplier_matches table for distance-based matching
CREATE TABLE IF NOT EXISTS rfq_supplier_matches (
    id SERIAL PRIMARY KEY,
    rfq_id INTEGER REFERENCES rfqs(id) ON DELETE CASCADE,
    supplier_id INTEGER REFERENCES Users(UserID) ON DELETE CASCADE,
    distance_miles DECIMAL(10, 1),
    notified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(rfq_id, supplier_id)
);
-- Indexes for fast geo queries
CREATE INDEX IF NOT EXISTS idx_users_location ON Users(latitude, longitude)
WHERE role = 'supplier'
    AND latitude IS NOT NULL
    AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rfqs_project_location ON rfqs(project_latitude, project_longitude)
WHERE project_latitude IS NOT NULL
    AND project_longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rfq_matches_rfq ON rfq_supplier_matches(rfq_id);
CREATE INDEX IF NOT EXISTS idx_rfq_matches_supplier ON rfq_supplier_matches(supplier_id);
CREATE INDEX IF NOT EXISTS idx_rfq_matches_distance ON rfq_supplier_matches(rfq_id, distance_miles);
-- Add comments for documentation
COMMENT ON COLUMN Users.latitude IS 'Latitude coordinate for supplier location (decimal degrees, -90 to 90)';
COMMENT ON COLUMN Users.longitude IS 'Longitude coordinate for supplier location (decimal degrees, -180 to 180)';
COMMENT ON COLUMN Users.service_radius IS 'Service radius in miles - how far supplier is willing to serve';
COMMENT ON COLUMN rfqs.project_latitude IS 'Latitude coordinate for project location (decimal degrees, -90 to 90)';
COMMENT ON COLUMN rfqs.project_longitude IS 'Longitude coordinate for project location (decimal degrees, -180 to 180)';
COMMENT ON TABLE rfq_supplier_matches IS 'Stores distance-matched suppliers for each RFQ based on location proximity';
-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================
-- Uncomment these lines to rollback:
--
-- DROP INDEX IF EXISTS idx_rfq_matches_distance;
-- DROP INDEX IF EXISTS idx_rfq_matches_supplier;
-- DROP INDEX IF EXISTS idx_rfq_matches_rfq;
-- DROP INDEX IF EXISTS idx_rfqs_project_location;
-- DROP INDEX IF EXISTS idx_users_location;
-- DROP TABLE IF EXISTS rfq_supplier_matches;
-- ALTER TABLE rfqs DROP COLUMN IF EXISTS project_longitude;
-- ALTER TABLE rfqs DROP COLUMN IF EXISTS project_latitude;
-- ALTER TABLE Users DROP COLUMN IF EXISTS service_radius;
-- ALTER TABLE Users DROP COLUMN IF EXISTS longitude;
-- ALTER TABLE Users DROP COLUMN IF EXISTS latitude;
-- ALTER TABLE Users DROP COLUMN IF EXISTS country;
-- ALTER TABLE Users DROP COLUMN IF EXISTS zip_code;
-- ALTER TABLE Users DROP COLUMN IF EXISTS state;
-- ALTER TABLE Users DROP COLUMN IF EXISTS city;
-- ALTER TABLE Users DROP COLUMN IF EXISTS address;
-- ============================================
-- VERIFICATION
-- ============================================
-- Run these queries after migration to verify success:
--
-- Check Users columns:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'Users' AND column_name IN ('latitude', 'longitude', 'service_radius', 'address', 'city', 'state');
--
-- Check rfqs columns:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'rfqs' AND column_name IN ('project_latitude', 'project_longitude');
--
-- Check rfq_supplier_matches table:
-- SELECT tablename FROM pg_tables WHERE tablename = 'rfq_supplier_matches';
--
-- Check indexes:
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('Users', 'rfqs', 'rfq_supplier_matches') AND indexname LIKE '%location%';