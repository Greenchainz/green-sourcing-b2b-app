-- Migration: Add LinkedIn User Verification System
-- Created: 2026-01-04 14:00:00
-- Author: Database Schema Agent
-- 
-- Description:
-- Creates user_verifications table for tracking OAuth-based identity verification
-- (LinkedIn, etc.). Adds linkedin_verified and linkedin_profile_url columns to Users.
-- Includes trigger to automatically sync verification status to Users table.
--
-- Impact:
-- - Performance: Minimal - new table with proper indexes
-- - Storage: ~500 bytes per verification record (includes JSONB profile data)
-- - Downtime: None - additive changes only
-- - Dependencies: Requires Users table from core schema

-- ============================================
-- UP MIGRATION
-- ============================================

-- Step 1: Create user_verifications table for OAuth identity verification
CREATE TABLE IF NOT EXISTS user_verifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES Users(UserID) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL CHECK (provider IN (
        'linkedin',
        'google',
        'microsoft',
        'github',
        'autodesk'  -- For Revit integration users
    )),
    provider_user_id VARCHAR(255) NOT NULL,
    provider_email VARCHAR(255),
    profile_url VARCHAR(500),
    profile_data JSONB DEFAULT '{}'::jsonb,
    access_token_hash VARCHAR(255),  -- Store hash, never plaintext
    refresh_token_hash VARCHAR(255), -- Store hash, never plaintext
    token_expires_at TIMESTAMPTZ,
    scopes TEXT[],
    verified_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_refreshed_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoke_reason TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Ensure one verification per provider per user
    CONSTRAINT user_verifications_unique_provider UNIQUE (user_id, provider)
);

-- Step 2: Create verification events log for audit trail
CREATE TABLE IF NOT EXISTS user_verification_events (
    id BIGSERIAL PRIMARY KEY,
    verification_id BIGINT REFERENCES user_verifications(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES Users(UserID) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'initiated',       -- OAuth flow started
        'completed',       -- Successfully verified
        'failed',          -- Verification failed
        'refreshed',       -- Token refreshed
        'revoked',         -- User revoked access
        'expired',         -- Token expired
        'profile_updated'  -- Profile data refreshed
    )),
    event_data JSONB DEFAULT '{}'::jsonb,
    error_code VARCHAR(100),
    error_message TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Step 3: Add LinkedIn verification columns to Users table
ALTER TABLE Users
ADD COLUMN IF NOT EXISTS linkedin_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS linkedin_profile_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS linkedin_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS linkedin_profile_id VARCHAR(255);

-- Step 4: Create indexes for efficient queries
-- Primary lookup by user
CREATE INDEX IF NOT EXISTS idx_user_verifications_user_id 
    ON user_verifications(user_id);

-- Provider-based queries
CREATE INDEX IF NOT EXISTS idx_user_verifications_provider 
    ON user_verifications(provider);

-- Lookup by provider user ID (for preventing duplicate OAuth accounts)
CREATE INDEX IF NOT EXISTS idx_user_verifications_provider_user_id 
    ON user_verifications(provider, provider_user_id);

-- Active (non-revoked) verifications
CREATE INDEX IF NOT EXISTS idx_user_verifications_active 
    ON user_verifications(user_id, provider) WHERE revoked_at IS NULL;

-- Token expiration checks (for refresh jobs)
CREATE INDEX IF NOT EXISTS idx_user_verifications_token_expires 
    ON user_verifications(token_expires_at) 
    WHERE token_expires_at IS NOT NULL AND revoked_at IS NULL;

-- Verification events by user
CREATE INDEX IF NOT EXISTS idx_user_verification_events_user 
    ON user_verification_events(user_id, created_at DESC);

-- Verification events by verification record
CREATE INDEX IF NOT EXISTS idx_user_verification_events_verification 
    ON user_verification_events(verification_id, created_at DESC);

-- Event type queries (for analytics/monitoring)
CREATE INDEX IF NOT EXISTS idx_user_verification_events_type 
    ON user_verification_events(event_type, created_at DESC);

-- Users LinkedIn verified index
CREATE INDEX IF NOT EXISTS idx_users_linkedin_verified 
    ON Users(linkedin_verified) WHERE linkedin_verified = TRUE;

-- Step 5: Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_verifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_verifications_updated_at ON user_verifications;
CREATE TRIGGER trg_user_verifications_updated_at
    BEFORE UPDATE ON user_verifications
    FOR EACH ROW
    EXECUTE FUNCTION update_user_verifications_updated_at();

-- Step 6: Create trigger to sync linkedin_verified to Users when verification inserted/updated
CREATE OR REPLACE FUNCTION sync_linkedin_verified_to_users()
RETURNS TRIGGER AS $$
BEGIN
    -- On INSERT or UPDATE for LinkedIn provider
    IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.provider = 'linkedin' THEN
        -- If verification is active (not revoked), mark user as verified
        IF NEW.revoked_at IS NULL THEN
            UPDATE Users
            SET linkedin_verified = TRUE,
                linkedin_profile_url = NEW.profile_url,
                linkedin_verified_at = NEW.verified_at,
                linkedin_profile_id = NEW.provider_user_id,
                UpdatedAt = CURRENT_TIMESTAMP
            WHERE UserID = NEW.user_id
              AND (linkedin_verified = FALSE OR linkedin_verified IS NULL 
                   OR linkedin_profile_url IS DISTINCT FROM NEW.profile_url);
        ELSE
            -- If revoked, unverify the user
            UPDATE Users
            SET linkedin_verified = FALSE,
                linkedin_verified_at = NULL,
                UpdatedAt = CURRENT_TIMESTAMP
            WHERE UserID = NEW.user_id
              AND linkedin_verified = TRUE
              AND linkedin_profile_id = NEW.provider_user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_linkedin_verified ON user_verifications;
CREATE TRIGGER trg_sync_linkedin_verified
    AFTER INSERT OR UPDATE ON user_verifications
    FOR EACH ROW
    EXECUTE FUNCTION sync_linkedin_verified_to_users();

-- Step 7: Create trigger to log verification events automatically
CREATE OR REPLACE FUNCTION log_verification_event()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO user_verification_events (
            verification_id, user_id, provider, event_type, 
            event_data, ip_address, user_agent
        ) VALUES (
            NEW.id, NEW.user_id, NEW.provider, 'completed',
            jsonb_build_object(
                'provider_user_id', NEW.provider_user_id,
                'profile_url', NEW.profile_url
            ),
            NEW.ip_address, NEW.user_agent
        );
    ELSIF TG_OP = 'UPDATE' THEN
        -- Log revocation
        IF NEW.revoked_at IS NOT NULL AND OLD.revoked_at IS NULL THEN
            INSERT INTO user_verification_events (
                verification_id, user_id, provider, event_type,
                event_data, ip_address, user_agent
            ) VALUES (
                NEW.id, NEW.user_id, NEW.provider, 'revoked',
                jsonb_build_object('reason', NEW.revoke_reason),
                NEW.ip_address, NEW.user_agent
            );
        -- Log token refresh
        ELSIF NEW.last_refreshed_at IS DISTINCT FROM OLD.last_refreshed_at THEN
            INSERT INTO user_verification_events (
                verification_id, user_id, provider, event_type,
                event_data, ip_address, user_agent
            ) VALUES (
                NEW.id, NEW.user_id, NEW.provider, 'refreshed',
                '{}'::jsonb, NEW.ip_address, NEW.user_agent
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_verification_event ON user_verifications;
CREATE TRIGGER trg_log_verification_event
    AFTER INSERT OR UPDATE ON user_verifications
    FOR EACH ROW
    EXECUTE FUNCTION log_verification_event();

-- Step 8: Add helpful comments
COMMENT ON TABLE user_verifications IS 'OAuth identity verifications (LinkedIn, Google, etc.) for user trust scoring';
COMMENT ON COLUMN user_verifications.provider IS 'OAuth provider name (linkedin, google, etc.)';
COMMENT ON COLUMN user_verifications.provider_user_id IS 'User ID from the OAuth provider';
COMMENT ON COLUMN user_verifications.profile_data IS 'JSONB containing provider-specific profile information';
COMMENT ON COLUMN user_verifications.access_token_hash IS 'SHA256 hash of access token (never store plaintext)';
COMMENT ON COLUMN user_verifications.revoked_at IS 'When user disconnected this provider';
COMMENT ON TABLE user_verification_events IS 'Audit log for all verification-related events';
COMMENT ON COLUMN Users.linkedin_verified IS 'Auto-synced from user_verifications when LinkedIn is connected';
COMMENT ON COLUMN Users.linkedin_profile_url IS 'LinkedIn public profile URL for display';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================
-- Uncomment these lines to rollback this migration:
--
-- -- Rollback Step 8: Remove comments (optional)
--
-- -- Rollback Step 7: Drop event logging trigger
-- DROP TRIGGER IF EXISTS trg_log_verification_event ON user_verifications;
-- DROP FUNCTION IF EXISTS log_verification_event();
--
-- -- Rollback Step 6: Drop LinkedIn sync trigger
-- DROP TRIGGER IF EXISTS trg_sync_linkedin_verified ON user_verifications;
-- DROP FUNCTION IF EXISTS sync_linkedin_verified_to_users();
--
-- -- Rollback Step 5: Drop updated_at trigger
-- DROP TRIGGER IF EXISTS trg_user_verifications_updated_at ON user_verifications;
-- DROP FUNCTION IF EXISTS update_user_verifications_updated_at();
--
-- -- Rollback Step 4: Drop indexes
-- DROP INDEX IF EXISTS idx_users_linkedin_verified;
-- DROP INDEX IF EXISTS idx_user_verification_events_type;
-- DROP INDEX IF EXISTS idx_user_verification_events_verification;
-- DROP INDEX IF EXISTS idx_user_verification_events_user;
-- DROP INDEX IF EXISTS idx_user_verifications_token_expires;
-- DROP INDEX IF EXISTS idx_user_verifications_active;
-- DROP INDEX IF EXISTS idx_user_verifications_provider_user_id;
-- DROP INDEX IF EXISTS idx_user_verifications_provider;
-- DROP INDEX IF EXISTS idx_user_verifications_user_id;
--
-- -- Rollback Step 3: Drop Users columns
-- ALTER TABLE Users DROP COLUMN IF EXISTS linkedin_profile_id;
-- ALTER TABLE Users DROP COLUMN IF EXISTS linkedin_verified_at;
-- ALTER TABLE Users DROP COLUMN IF EXISTS linkedin_profile_url;
-- ALTER TABLE Users DROP COLUMN IF EXISTS linkedin_verified;
--
-- -- Rollback Step 2: Drop verification events table
-- DROP TABLE IF EXISTS user_verification_events;
--
-- -- Rollback Step 1: Drop user_verifications table
-- DROP TABLE IF EXISTS user_verifications;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these queries after applying migration to verify success:
--
-- -- Check user_verifications table was created:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_name = 'user_verifications';
--
-- -- Check columns on user_verifications:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'user_verifications'
-- ORDER BY ordinal_position;
--
-- -- Check Users columns were added:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' 
--   AND column_name IN ('linkedin_verified', 'linkedin_profile_url', 'linkedin_verified_at', 'linkedin_profile_id');
--
-- -- Check triggers exist:
-- SELECT trigger_name, event_manipulation, action_statement 
-- FROM information_schema.triggers 
-- WHERE event_object_table = 'user_verifications';
--
-- -- Test the sync trigger:
-- -- INSERT INTO user_verifications (user_id, provider, provider_user_id, profile_url)
-- -- VALUES (1, 'linkedin', 'test123', 'https://linkedin.com/in/test');
-- -- SELECT linkedin_verified, linkedin_profile_url FROM Users WHERE UserID = 1;

-- ============================================
-- NOTES
-- ============================================
-- - Access tokens should be hashed with SHA256 before storing
-- - The sync trigger automatically updates Users.linkedin_verified when LinkedIn verification is added
-- - Consider adding a scheduled job to check token expiration and refresh tokens
-- - Profile data can include: name, headline, picture, industry, connections count
-- - For GDPR compliance, the revoke feature allows users to disconnect providers
