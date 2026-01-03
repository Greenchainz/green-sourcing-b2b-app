-- Migration: Add auth tables for JWT + OAuth2
-- Created: 2026-01-03
-- Purpose: Support Azure AD authentication with JWT tokens

-- Update Users table to add Azure AD fields if not exist
ALTER TABLE IF EXISTS Users
ADD COLUMN IF NOT EXISTS azure_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'architect' CHECK(role IN ('architect', 'supplier'));

-- Create refresh tokens table for long-lived access
CREATE TABLE IF NOT EXISTS RefreshTokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
  UNIQUE(user_id, token)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON RefreshTokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON RefreshTokens(token);
CREATE INDEX IF NOT EXISTS idx_users_azure_id ON Users(azure_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON Users(email);

-- Log table for audit trail
CREATE TABLE IF NOT EXISTS AuthLogs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  action VARCHAR(50) NOT NULL, -- 'login', 'logout', 'token_refresh', 'role_change'
  ip_address VARCHAR(45),
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON AuthLogs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON AuthLogs(created_at);
