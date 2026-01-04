-- Migration: Add LinkedIn Verification System
-- Created: 2026-01-04 14:00:00
-- Author: GreenChainz DB-SCHEMA Agent
-- 
-- Description:
-- Creates the user verification system to track LinkedIn and other
-- identity verifications. Buyers must verify via LinkedIn before
-- creating RFQs, and suppliers see a "LinkedIn Verified" badge.
--
-- Impact:
-- - Performance: Minimal - small lookup table
-- - Storage: ~500 bytes per verification
-- - Downtime: None - additive changes only

-- ============================================
-- UP MIGRATION
-- ============================================

-- Step 1: Create User Verifications table (supports multiple providers)
CREATE TABLE IF NOT EXISTS user_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- Provider info
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('linkedin', 'email', 'phone', 'government_id', 'company')),
    provider_user_id VARCHAR(255),
    
    -- Verification status
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    revoked_at TIMESTAMP,
    revocation_reason TEXT,
    
    -- Profile data from provider (stored securely, no secrets)
    profile_data JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata
    verification_method VARCHAR(100), -- 'oauth', 'manual', 'api'
    verified_by_user_id UUID, -- For manual verifications
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint: one verification per provider per user
    CONSTRAINT unique_user_provider UNIQUE (user_id, provider)
);

COMMENT ON TABLE user_verifications IS 'Tracks identity verifications from LinkedIn and other providers';

-- Step 2: Add LinkedIn verification columns to users table
-- Note: These columns provide quick lookup without JOIN
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_profile_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_verified_at TIMESTAMP;

-- Add deposit verified badge (shown to suppliers)
ALTER TABLE users ADD COLUMN IF NOT EXISTS deposit_verified_badge BOOLEAN DEFAULT FALSE;

-- Add verification score (composite of all verifications)
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_score INTEGER DEFAULT 0 CHECK (verification_score >= 0 AND verification_score <= 100);

COMMENT ON COLUMN users.linkedin_verified IS 'TRUE if user has verified their LinkedIn identity';
COMMENT ON COLUMN users.deposit_verified_badge IS 'TRUE if user has made verified deposit payments';
COMMENT ON COLUMN users.verification_score IS 'Composite score 0-100 based on all verifications';

-- Step 3: Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_verifications_user ON user_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_verifications_provider ON user_verifications(provider, provider_user_id);
CREATE INDEX IF NOT EXISTS idx_user_verifications_active ON user_verifications(user_id, provider) 
    WHERE revoked_at IS NULL AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP);

CREATE INDEX IF NOT EXISTS idx_users_linkedin_verified ON users(linkedin_verified) WHERE linkedin_verified = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_verification_score ON users(verification_score DESC);

-- Step 4: Create trigger to update users table when LinkedIn verified
CREATE OR REPLACE FUNCTION sync_linkedin_verification()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.provider = 'linkedin' AND NEW.revoked_at IS NULL THEN
        UPDATE users SET 
            linkedin_verified = TRUE,
            linkedin_verified_at = NEW.verified_at,
            linkedin_profile_url = NEW.profile_data->>'profile_url',
            verification_score = GREATEST(verification_score, 25),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_linkedin_verification ON user_verifications;
CREATE TRIGGER trg_sync_linkedin_verification
    AFTER INSERT OR UPDATE ON user_verifications
    FOR EACH ROW EXECUTE FUNCTION sync_linkedin_verification();

-- Step 5: Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_verifications_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_verifications_updated ON user_verifications;
CREATE TRIGGER trg_user_verifications_updated
    BEFORE UPDATE ON user_verifications
    FOR EACH ROW EXECUTE FUNCTION update_user_verifications_timestamp();

-- Step 6: Create helper function to check if user is verified
CREATE OR REPLACE FUNCTION is_user_verified(p_user_id UUID, p_provider VARCHAR(50) DEFAULT 'linkedin')
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_verifications
        WHERE user_id = p_user_id
        AND provider = p_provider
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    );
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create function to get user verification summary
CREATE OR REPLACE FUNCTION get_user_verification_summary(p_user_id UUID)
RETURNS TABLE (
    provider VARCHAR(50),
    verified BOOLEAN,
    verified_at TIMESTAMP,
    expires_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.provider,
        (v.revoked_at IS NULL AND (v.expires_at IS NULL OR v.expires_at > CURRENT_TIMESTAMP)) AS verified,
        v.verified_at,
        v.expires_at
    FROM user_verifications v
    WHERE v.user_id = p_user_id
    ORDER BY v.verified_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================
-- Uncomment these lines to rollback this migration:
--
-- DROP FUNCTION IF EXISTS get_user_verification_summary(UUID);
-- DROP FUNCTION IF EXISTS is_user_verified(UUID, VARCHAR);
-- DROP TRIGGER IF EXISTS trg_user_verifications_updated ON user_verifications;
-- DROP FUNCTION IF EXISTS update_user_verifications_timestamp();
-- DROP TRIGGER IF EXISTS trg_sync_linkedin_verification ON user_verifications;
-- DROP FUNCTION IF EXISTS sync_linkedin_verification();
-- DROP INDEX IF EXISTS idx_users_verification_score;
-- DROP INDEX IF EXISTS idx_users_linkedin_verified;
-- DROP INDEX IF EXISTS idx_user_verifications_active;
-- DROP INDEX IF EXISTS idx_user_verifications_provider;
-- DROP INDEX IF EXISTS idx_user_verifications_user;
-- ALTER TABLE users DROP COLUMN IF EXISTS verification_score;
-- ALTER TABLE users DROP COLUMN IF EXISTS deposit_verified_badge;
-- ALTER TABLE users DROP COLUMN IF EXISTS linkedin_verified_at;
-- ALTER TABLE users DROP COLUMN IF EXISTS linkedin_profile_url;
-- ALTER TABLE users DROP COLUMN IF EXISTS linkedin_verified;
-- DROP TABLE IF EXISTS user_verifications;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run after applying:
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'user_verifications';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name LIKE 'linkedin%';
-- SELECT proname FROM pg_proc WHERE proname LIKE '%verification%';
