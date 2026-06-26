-- Migration: 20260626_sda_connector_tables
-- Adds tables and columns required for the SDA connector integration:
--   - api_keys table for SDA Bearer token authentication
--   - audit_credits_remaining column on profiles for carbon audit gating

-- ── api_keys table ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  jurisdictions TEXT[] DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);

-- ── audit_credits_remaining on profiles ──────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS audit_credits_remaining INTEGER DEFAULT 3;

-- ── analysis_jobs table (for model analysis tracking) ────────────────────────

CREATE TABLE IF NOT EXISTS analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_urn TEXT NOT NULL,
  project_id UUID,
  architect_id UUID,
  status TEXT DEFAULT 'processing',
  results JSONB,
  total_carbon_footprint DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status ON analysis_jobs(status);
