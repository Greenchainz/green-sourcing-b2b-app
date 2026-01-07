-- Migration: Add Azure AD authentication columns and RefreshTokens table
-- Date: 2026-01-07
-- Description: Adds necessary columns and tables for Azure AD authentication
--              to work with the backend auth routes.
--
-- The backend auth code expects:
-- - Users table with lowercase columns: id, email, first_name, last_name, azure_id, role
-- - RefreshTokens table for storing refresh tokens
-- - Role values: 'architect' (buyer) or 'supplier'
--
-- The existing schema uses PascalCase (UserID, Email, etc.) and different role values.
-- This migration adds compatibility columns and updates the role constraint.

-- ============================================
-- PART 1: Update Role constraint to include 'architect'
-- ============================================

-- Drop the existing constraint and add a new one with 'architect' role
-- Note: In this application, 'architect' is semantically equivalent to 'Buyer'
-- (architects are professionals who buy building materials)
ALTER TABLE Users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE Users ADD CONSTRAINT users_role_check 
    CHECK (Role IN ('Admin', 'Buyer', 'Supplier', 'architect', 'supplier'));

-- ============================================
-- PART 2: Add azure_id column to Users table
-- ============================================

-- Add azure_id column if it doesn't exist
-- This stores the Azure AD Object ID (oid claim) for each user
ALTER TABLE Users ADD COLUMN IF NOT EXISTS azure_id VARCHAR(255) UNIQUE;

-- Create index for faster lookups by azure_id
CREATE INDEX IF NOT EXISTS idx_users_azure_id ON Users(azure_id);

-- ============================================
-- PART 3: Add lowercase alias columns to Users
-- ============================================

-- The backend auth code expects lowercase column names with underscores.
-- We add these as actual columns that can be kept in sync with the PascalCase columns.
-- Note: PostgreSQL doesn't support column aliases, so we use actual columns.

-- Add 'id' column as an alias for UserID (if not exists)
-- We'll use a generated column that references UserID
ALTER TABLE Users ADD COLUMN IF NOT EXISTS id BIGINT;

-- For existing rows, set id = UserID
UPDATE Users SET id = UserID WHERE id IS NULL;

-- Add first_name and last_name columns if they don't exist
ALTER TABLE Users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE Users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- Copy existing data from PascalCase columns to lowercase columns
UPDATE Users SET first_name = FirstName WHERE first_name IS NULL AND FirstName IS NOT NULL;
UPDATE Users SET last_name = LastName WHERE last_name IS NULL AND LastName IS NOT NULL;

-- Add last_login column if it doesn't exist
ALTER TABLE Users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- ============================================
-- PART 4: Create RefreshTokens table
-- ============================================

-- The refresh tokens table stores JWT refresh tokens for session management.
-- Tokens are stored with their user_id and expiration time.
CREATE TABLE IF NOT EXISTS RefreshTokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES Users(UserID) ON DELETE CASCADE,
    CONSTRAINT uq_refresh_tokens_user UNIQUE (user_id)
);

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON RefreshTokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON RefreshTokens(expires_at);

-- ============================================
-- PART 5: Create a trigger to keep id in sync with UserID
-- ============================================

-- Create or replace function to sync id with UserID
CREATE OR REPLACE FUNCTION sync_user_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.id := NEW.UserID;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_sync_user_id ON Users;

-- Create trigger to automatically set id when UserID changes
CREATE TRIGGER trigger_sync_user_id
    BEFORE INSERT OR UPDATE ON Users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_id();

-- ============================================
-- PART 6: Create function to sync name columns
-- ============================================

-- Create or replace function to sync name columns
CREATE OR REPLACE FUNCTION sync_user_names()
RETURNS TRIGGER AS $$
BEGIN
    -- On INSERT, OLD is NULL, so handle INSERT and UPDATE differently
    IF TG_OP = 'INSERT' THEN
        -- On insert, prioritize lowercase columns if set, otherwise copy from PascalCase
        IF NEW.first_name IS NOT NULL THEN
            NEW.FirstName := NEW.first_name;
        ELSIF NEW.FirstName IS NOT NULL THEN
            NEW.first_name := NEW.FirstName;
        END IF;
        
        IF NEW.last_name IS NOT NULL THEN
            NEW.LastName := NEW.last_name;
        ELSIF NEW.LastName IS NOT NULL THEN
            NEW.last_name := NEW.LastName;
        END IF;
    ELSE
        -- On UPDATE, sync whichever column changed
        IF NEW.first_name IS DISTINCT FROM OLD.first_name THEN
            NEW.FirstName := NEW.first_name;
        ELSIF NEW.FirstName IS DISTINCT FROM OLD.FirstName THEN
            NEW.first_name := NEW.FirstName;
        END IF;
        
        IF NEW.last_name IS DISTINCT FROM OLD.last_name THEN
            NEW.LastName := NEW.last_name;
        ELSIF NEW.LastName IS DISTINCT FROM OLD.LastName THEN
            NEW.last_name := NEW.LastName;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_sync_user_names ON Users;

-- Create trigger to automatically sync name columns
CREATE TRIGGER trigger_sync_user_names
    BEFORE INSERT OR UPDATE ON Users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_names();

-- ============================================
-- VERIFICATION QUERIES (for testing)
-- ============================================
-- After running this migration, you can verify with:
--
-- -- Check Users table structure
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';
--
-- -- Check RefreshTokens table exists
-- SELECT * FROM information_schema.tables WHERE table_name = 'refreshtokens';
--
-- -- Test insert a user with azure_id
-- INSERT INTO Users (Email, first_name, last_name, azure_id, Role)
-- VALUES ('test@example.com', 'Test', 'User', 'azure-object-id-123', 'architect')
-- RETURNING UserID, id, Email, first_name, last_name, azure_id, Role;
