-- Migration: Add NextAuth.js authentication tables
-- Created: 2026-01-26 16:57:00
-- Author: GitHub Copilot
-- 
-- Description:
-- This migration creates the required tables for NextAuth.js v5 authentication system.
-- It replaces the custom MSAL/Azure AD B2C authentication with a unified NextAuth approach.
-- Tables created: users, accounts, sessions, verification_tokens
--
-- Impact:
-- - Performance: Minimal - new tables with standard indexes
-- - Storage: ~100KB initial, grows with user base
-- - Downtime: None - new tables don't affect existing functionality
-- - Dependencies: Requires Prisma Client v5+ and NextAuth v5+

-- ============================================
-- UP MIGRATION
-- ============================================

-- Step 1: Create users table for NextAuth
-- This is the main user table that stores user profiles
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT,
  "email" TEXT UNIQUE,
  "emailVerified" TIMESTAMP(3),
  "image" TEXT,
  "password" TEXT,
  "plan" TEXT NOT NULL DEFAULT 'free',
  "role" TEXT NOT NULL DEFAULT 'user',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Create accounts table for OAuth providers
-- Links users to their OAuth provider accounts (Google, Azure AD, LinkedIn)
CREATE TABLE IF NOT EXISTS "accounts" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 3: Create sessions table for JWT sessions
-- Stores active user sessions
CREATE TABLE IF NOT EXISTS "sessions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionToken" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 4: Create verification tokens table
-- Used for email verification and password reset flows
CREATE TABLE IF NOT EXISTS "verification_tokens" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "expires" TIMESTAMP(3) NOT NULL
);

-- Step 5: Add indexes for efficient queries
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");
CREATE INDEX IF NOT EXISTS "accounts_userId_idx" ON "accounts"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_sessionToken_key" ON "sessions"("sessionToken");
CREATE INDEX IF NOT EXISTS "sessions_userId_idx" ON "sessions"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_token_key" ON "verification_tokens"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================
-- Uncomment these lines to rollback this migration:
--
-- -- Rollback Step 5: Drop indexes
-- DROP INDEX IF EXISTS "verification_tokens_identifier_token_key";
-- DROP INDEX IF EXISTS "verification_tokens_token_key";
-- DROP INDEX IF EXISTS "sessions_userId_idx";
-- DROP INDEX IF EXISTS "sessions_sessionToken_key";
-- DROP INDEX IF EXISTS "accounts_userId_idx";
-- DROP INDEX IF EXISTS "accounts_provider_providerAccountId_key";
-- DROP INDEX IF EXISTS "users_email_key";
--
-- -- Rollback Step 4: Drop verification_tokens table
-- DROP TABLE IF EXISTS "verification_tokens";
--
-- -- Rollback Step 3: Drop sessions table
-- DROP TABLE IF EXISTS "sessions";
--
-- -- Rollback Step 2: Drop accounts table
-- DROP TABLE IF EXISTS "accounts";
--
-- -- Rollback Step 1: Drop users table
-- DROP TABLE IF EXISTS "users";

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these queries after applying migration to verify success:
--
-- -- Check all tables were created:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('users', 'accounts', 'sessions', 'verification_tokens');
--
-- -- Check indexes exist:
-- SELECT indexname, tablename FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('users', 'accounts', 'sessions', 'verification_tokens')
-- ORDER BY tablename, indexname;
--
-- -- Verify foreign key constraints:
-- SELECT conname, conrelid::regclass AS table_name, 
--        confrelid::regclass AS foreign_table
-- FROM pg_constraint 
-- WHERE contype = 'f' 
-- AND conrelid::regclass::text IN ('accounts', 'sessions');
--
-- -- Test basic insert (will be rolled back):
-- BEGIN;
-- INSERT INTO users (id, email, name, plan, role) 
-- VALUES ('test-user-id', 'test@example.com', 'Test User', 'free', 'user');
-- SELECT * FROM users WHERE email = 'test@example.com';
-- ROLLBACK;

-- ============================================
-- NOTES
-- ============================================
-- - This migration creates new tables and does not modify existing Users table
-- - The new 'users' table is separate from the legacy 'Users' table (case-sensitive)
-- - Future migration may be needed to migrate data from 'Users' to 'users' table
-- - OAuth providers are configured in lib/auth.ts (Google, Azure AD, LinkedIn)
-- - Session strategy is JWT with 30-day max age
-- - Password hashing uses bcryptjs for credentials provider
