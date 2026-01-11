-- Migration: Add Scraper Columns to Users Table
-- Created: 2026-01-08
-- Description: Adds columns for supplier website scraping functionality
-- 
-- NOTE: This migration uses the correct table name:
--   - Users (capitalized) with UserID primary key
--   - Matches the existing schema and migration pattern

-- ============================================
-- ADD SCRAPER COLUMNS TO USERS TABLE
-- ============================================

ALTER TABLE Users ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE Users ADD COLUMN IF NOT EXISTS scraped_description TEXT;
ALTER TABLE Users ADD COLUMN IF NOT EXISTS scraped_email VARCHAR(255);
ALTER TABLE Users ADD COLUMN IF NOT EXISTS scraped_phone VARCHAR(50);
ALTER TABLE Users ADD COLUMN IF NOT EXISTS scraped_certifications JSONB;
ALTER TABLE Users ADD COLUMN IF NOT EXISTS last_scraped_at TIMESTAMP;

-- ============================================
-- CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_last_scraped ON Users(last_scraped_at);
CREATE INDEX IF NOT EXISTS idx_users_website ON Users(website) WHERE website IS NOT NULL AND website != '';
