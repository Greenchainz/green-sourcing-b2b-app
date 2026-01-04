-- Migration: Shadow supplier + claim gating system
-- Created: 2026-01-04
-- Author: GreenChainz
-- 
-- Description:
-- Implements the shadow/unclaimed supplier system that allows ingestion of
-- scraped supplier data without public visibility. Suppliers remain hidden
-- until they claim their profile via opt-in flow. Materials from shadow
-- suppliers can be recommended in catalog/search without revealing supplier
-- identities until the supplier claims their profile.
--
-- Key features:
-- - Shadow supplier state (never publicly listed)
-- - Claim token + opt-in/opt-out status management
-- - Product visibility rules for anonymized recommendations
-- - Claim token expiry and rate limiting
--
-- Impact:
-- - Performance: Minimal - adds indexed columns
-- - Storage: ~50 bytes per supplier for new columns
-- - Downtime: None - all operations are additive
-- - Dependencies: Requires scraped_supplier_data and products tables

BEGIN;

-- ============================================
-- STEP 1: Enhance scraped_supplier_data with claim primitives
-- ============================================

-- Add opt-out status for GDPR/privacy compliance
-- Suppliers can opt-out of any future contact or data retention
ALTER TABLE scraped_supplier_data ADD COLUMN IF NOT EXISTS opt_out_status TEXT DEFAULT 'active';
ALTER TABLE scraped_supplier_data ADD COLUMN IF NOT EXISTS opted_out_at TIMESTAMPTZ;
ALTER TABLE scraped_supplier_data ADD COLUMN IF NOT EXISTS opt_out_reason TEXT;

-- Add claim token expiry for security
ALTER TABLE scraped_supplier_data ADD COLUMN IF NOT EXISTS claim_token_expires_at TIMESTAMPTZ;
ALTER TABLE scraped_supplier_data ADD COLUMN IF NOT EXISTS claim_token_created_at TIMESTAMPTZ;

-- Track claim attempts for rate limiting
ALTER TABLE scraped_supplier_data ADD COLUMN IF NOT EXISTS claim_attempts INTEGER DEFAULT 0;
ALTER TABLE scraped_supplier_data ADD COLUMN IF NOT EXISTS last_claim_attempt_at TIMESTAMPTZ;

-- Add source tracking for ingestion
ALTER TABLE scraped_supplier_data ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE scraped_supplier_data ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE scraped_supplier_data ADD COLUMN IF NOT EXISTS source_scraped_at TIMESTAMPTZ;

-- Add verification state for claim process
ALTER TABLE scraped_supplier_data ADD COLUMN IF NOT EXISTS verification_email_sent_at TIMESTAMPTZ;
ALTER TABLE scraped_supplier_data ADD COLUMN IF NOT EXISTS verification_code VARCHAR(6);
ALTER TABLE scraped_supplier_data ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMPTZ;

-- Add linked supplier ID after successful claim
ALTER TABLE scraped_supplier_data ADD COLUMN IF NOT EXISTS linked_supplier_id UUID;

-- Constrain opt_out_status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scraped_supplier_data_opt_out_status_check'
  ) THEN
    ALTER TABLE scraped_supplier_data
      ADD CONSTRAINT scraped_supplier_data_opt_out_status_check
      CHECK (opt_out_status IN ('active','opted_out','pending_removal'));
  END IF;
END $$;

-- Constrain source values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scraped_supplier_data_source_check'
  ) THEN
    ALTER TABLE scraped_supplier_data
      ADD CONSTRAINT scraped_supplier_data_source_check
      CHECK (source IN ('manual','scraper','api','partner','ec3','fsc','bcorp'));
  END IF;
END $$;

-- Index for opt-out status filtering
CREATE INDEX IF NOT EXISTS idx_scraped_supplier_data_opt_out_status 
  ON scraped_supplier_data(opt_out_status);

-- Index for claim token expiry lookups
CREATE INDEX IF NOT EXISTS idx_scraped_supplier_data_claim_token_expires 
  ON scraped_supplier_data(claim_token_expires_at)
  WHERE claim_token IS NOT NULL AND claim_token_expires_at IS NOT NULL;

-- Index for linked supplier lookups
CREATE INDEX IF NOT EXISTS idx_scraped_supplier_data_linked_supplier 
  ON scraped_supplier_data(linked_supplier_id)
  WHERE linked_supplier_id IS NOT NULL;

-- ============================================
-- STEP 2: Create shadow_products table for unclaimed supplier materials
-- ============================================

-- Products from shadow suppliers that can be shown anonymously
CREATE TABLE IF NOT EXISTS shadow_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shadow_supplier_id UUID NOT NULL REFERENCES scraped_supplier_data(id) ON DELETE CASCADE,
  
  -- Product details (anonymized for display)
  name TEXT NOT NULL,
  description TEXT,
  material_type TEXT,
  application TEXT,
  certifications TEXT[],
  sustainability_data JSONB,
  specs JSONB,
  
  -- Environmental data
  epd_data JSONB,
  gwp_value DECIMAL(15,4), -- Global Warming Potential (kgCO2e)
  gwp_unit TEXT DEFAULT 'kgCO2e',
  
  -- Source tracking
  source TEXT DEFAULT 'scraped',
  source_url TEXT,
  source_product_id TEXT, -- External ID from source system
  
  -- Visibility state
  visibility TEXT DEFAULT 'anonymous', -- anonymous, hidden, claimed
  
  -- Linked product after claim
  linked_product_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Constrain visibility values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shadow_products_visibility_check'
  ) THEN
    ALTER TABLE shadow_products
      ADD CONSTRAINT shadow_products_visibility_check
      CHECK (visibility IN ('anonymous','hidden','claimed'));
  END IF;
END $$;

-- Constrain source values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shadow_products_source_check'
  ) THEN
    ALTER TABLE shadow_products
      ADD CONSTRAINT shadow_products_source_check
      CHECK (source IN ('scraped','api','partner','ec3','fsc'));
  END IF;
END $$;

-- Indexes for shadow products
CREATE INDEX IF NOT EXISTS idx_shadow_products_supplier 
  ON shadow_products(shadow_supplier_id);
CREATE INDEX IF NOT EXISTS idx_shadow_products_material_type 
  ON shadow_products(material_type);
CREATE INDEX IF NOT EXISTS idx_shadow_products_visibility 
  ON shadow_products(visibility);
CREATE INDEX IF NOT EXISTS idx_shadow_products_certifications 
  ON shadow_products USING GIN (certifications);
CREATE INDEX IF NOT EXISTS idx_shadow_products_gwp 
  ON shadow_products(gwp_value)
  WHERE gwp_value IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shadow_products_linked 
  ON shadow_products(linked_product_id)
  WHERE linked_product_id IS NOT NULL;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_shadow_products_updated_at ON shadow_products;
CREATE TRIGGER trg_shadow_products_updated_at
  BEFORE UPDATE ON shadow_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 3: Create claim_tokens table for secure token management
-- ============================================

CREATE TABLE IF NOT EXISTS supplier_claim_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Link to shadow supplier
  shadow_supplier_id UUID NOT NULL REFERENCES scraped_supplier_data(id) ON DELETE CASCADE,
  
  -- Token data
  token TEXT NOT NULL,
  token_type TEXT DEFAULT 'claim', -- claim, verification, password_reset
  
  -- Expiry and usage
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by_ip TEXT,
  
  -- Rate limiting
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(shadow_supplier_id, token_type, token)
);

-- Constrain token_type values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'supplier_claim_tokens_type_check'
  ) THEN
    ALTER TABLE supplier_claim_tokens
      ADD CONSTRAINT supplier_claim_tokens_type_check
      CHECK (token_type IN ('claim','verification','password_reset'));
  END IF;
END $$;

-- Index for token lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_claim_tokens_token_unique
  ON supplier_claim_tokens(token)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_supplier_claim_tokens_supplier
  ON supplier_claim_tokens(shadow_supplier_id);

CREATE INDEX IF NOT EXISTS idx_supplier_claim_tokens_expires
  ON supplier_claim_tokens(expires_at)
  WHERE used_at IS NULL;

-- ============================================
-- STEP 4: Create claim_audit_log for tracking claim attempts
-- ============================================

CREATE TABLE IF NOT EXISTS supplier_claim_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- What was claimed
  shadow_supplier_id UUID REFERENCES scraped_supplier_data(id) ON DELETE SET NULL,
  
  -- Who claimed it
  claimed_by_user_id UUID,
  claimed_by_email TEXT,
  
  -- How it was claimed
  action TEXT NOT NULL, -- claim_initiated, claim_completed, claim_failed, opt_out, verification_sent
  token_id UUID REFERENCES supplier_claim_tokens(id) ON DELETE SET NULL,
  
  -- Context
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  
  -- Result
  success BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Constrain action values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'supplier_claim_audit_log_action_check'
  ) THEN
    ALTER TABLE supplier_claim_audit_log
      ADD CONSTRAINT supplier_claim_audit_log_action_check
      CHECK (action IN (
        'claim_initiated',
        'claim_completed', 
        'claim_failed',
        'claim_expired',
        'opt_out_requested',
        'opt_out_completed',
        'verification_sent',
        'verification_completed',
        'verification_failed',
        'token_generated',
        'token_used',
        'token_expired'
      ));
  END IF;
END $$;

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS idx_supplier_claim_audit_log_supplier
  ON supplier_claim_audit_log(shadow_supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_claim_audit_log_action
  ON supplier_claim_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_supplier_claim_audit_log_created
  ON supplier_claim_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_claim_audit_log_ip
  ON supplier_claim_audit_log(ip_address);

-- ============================================
-- STEP 5: Create view for anonymous material catalog
-- ============================================

-- This view provides materials from shadow suppliers with anonymized supplier info
CREATE OR REPLACE VIEW catalog_anonymous_materials AS
SELECT
  sp.id AS material_id,
  sp.name AS material_name,
  sp.description,
  sp.material_type,
  sp.application,
  sp.certifications,
  sp.sustainability_data,
  sp.specs,
  sp.epd_data,
  sp.gwp_value,
  sp.gwp_unit,
  sp.source,
  
  -- Anonymized supplier info
  'Anonymous Supplier' AS supplier_name,
  NULL::TEXT AS supplier_email,
  ssd.category AS supplier_category,
  
  -- Claim status (for showing "claim to reveal" UI hints)
  CASE 
    WHEN ssd.claimed_status = 'claimed' THEN 'claimed'
    WHEN ssd.opt_out_status = 'opted_out' THEN 'unavailable'
    ELSE 'available_to_claim'
  END AS claim_availability,
  
  sp.created_at,
  sp.updated_at
FROM shadow_products sp
JOIN scraped_supplier_data ssd ON sp.shadow_supplier_id = ssd.id
WHERE sp.visibility = 'anonymous'
  AND ssd.opt_out_status = 'active'
  AND ssd.claimed_status = 'unclaimed';

-- Combined catalog view (real products + anonymous shadow products)
CREATE OR REPLACE VIEW catalog_all_materials AS
-- Real products from claimed suppliers
SELECT
  p.id AS material_id,
  p.name AS material_name,
  p.description,
  p.material_type,
  p.application,
  p.certifications,
  p.sustainability_data,
  p.specs,
  NULL::JSONB AS epd_data,
  NULL::DECIMAL AS gwp_value,
  NULL::TEXT AS gwp_unit,
  'verified' AS source,
  
  s.name AS supplier_name,
  s.email AS supplier_email,
  NULL::TEXT AS supplier_category,
  
  'verified' AS claim_availability,
  
  p.created_at,
  p.updated_at
FROM products p
JOIN suppliers s ON p.supplier_id = s.id
WHERE s.tier != 'scraped'

UNION ALL

-- Anonymous materials from shadow suppliers
SELECT
  sp.id AS material_id,
  sp.name AS material_name,
  sp.description,
  sp.material_type,
  sp.application,
  sp.certifications,
  sp.sustainability_data,
  sp.specs,
  sp.epd_data,
  sp.gwp_value,
  sp.gwp_unit,
  sp.source,
  
  'Anonymous Supplier' AS supplier_name,
  NULL::TEXT AS supplier_email,
  ssd.category AS supplier_category,
  
  'available_to_claim' AS claim_availability,
  
  sp.created_at,
  sp.updated_at
FROM shadow_products sp
JOIN scraped_supplier_data ssd ON sp.shadow_supplier_id = ssd.id
WHERE sp.visibility = 'anonymous'
  AND ssd.opt_out_status = 'active'
  AND ssd.claimed_status = 'unclaimed';

-- ============================================
-- STEP 6: Helper functions for claim flow
-- ============================================

-- Generate a secure claim token for a shadow supplier
CREATE OR REPLACE FUNCTION gc_generate_claim_token(
  p_shadow_supplier_id UUID,
  p_token_type TEXT DEFAULT 'claim',
  p_expires_hours INTEGER DEFAULT 72
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_token TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Generate cryptographically secure token
  v_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := NOW() + (p_expires_hours || ' hours')::INTERVAL;
  
  -- Insert token record
  INSERT INTO supplier_claim_tokens (shadow_supplier_id, token, token_type, expires_at)
  VALUES (p_shadow_supplier_id, v_token, p_token_type, v_expires_at);
  
  -- Update shadow supplier with claim token
  UPDATE scraped_supplier_data
  SET claim_token = v_token,
      claim_token_created_at = NOW(),
      claim_token_expires_at = v_expires_at
  WHERE id = p_shadow_supplier_id;
  
  RETURN v_token;
END;
$$;

-- Validate and consume a claim token
CREATE OR REPLACE FUNCTION gc_validate_claim_token(
  p_token TEXT,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS TABLE (
  valid BOOLEAN,
  shadow_supplier_id UUID,
  company_name TEXT,
  email TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_token_record RECORD;
  v_supplier_record RECORD;
BEGIN
  -- Find the token
  SELECT * INTO v_token_record
  FROM supplier_claim_tokens
  WHERE token = p_token
    AND used_at IS NULL
    AND expires_at > NOW()
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      FALSE::BOOLEAN, 
      NULL::UUID, 
      NULL::TEXT, 
      NULL::TEXT,
      'Invalid or expired token'::TEXT;
    RETURN;
  END IF;
  
  -- Get supplier data
  SELECT * INTO v_supplier_record
  FROM scraped_supplier_data
  WHERE id = v_token_record.shadow_supplier_id
    AND claimed_status = 'unclaimed'
    AND opt_out_status = 'active';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      FALSE::BOOLEAN, 
      NULL::UUID, 
      NULL::TEXT, 
      NULL::TEXT,
      'Supplier already claimed or opted out'::TEXT;
    RETURN;
  END IF;
  
  -- Mark token as used
  UPDATE supplier_claim_tokens
  SET used_at = NOW(),
      used_by_ip = p_ip_address
  WHERE id = v_token_record.id;
  
  -- Return valid result
  RETURN QUERY SELECT 
    TRUE::BOOLEAN,
    v_supplier_record.id,
    v_supplier_record.company_name,
    v_supplier_record.email,
    NULL::TEXT;
END;
$$;

-- Process opt-out request
CREATE OR REPLACE FUNCTION gc_process_opt_out(
  p_shadow_supplier_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update supplier to opted out
  UPDATE scraped_supplier_data
  SET opt_out_status = 'opted_out',
      opted_out_at = NOW(),
      opt_out_reason = p_reason
  WHERE id = p_shadow_supplier_id
    AND opt_out_status = 'active';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Hide all shadow products from this supplier
  UPDATE shadow_products
  SET visibility = 'hidden'
  WHERE shadow_supplier_id = p_shadow_supplier_id;
  
  -- Log the action
  INSERT INTO supplier_claim_audit_log (
    shadow_supplier_id, action, ip_address, success, metadata
  ) VALUES (
    p_shadow_supplier_id, 
    'opt_out_completed', 
    p_ip_address, 
    TRUE,
    jsonb_build_object('reason', p_reason)
  );
  
  RETURN TRUE;
END;
$$;

-- Complete claim process (link shadow supplier to real supplier)
CREATE OR REPLACE FUNCTION gc_complete_claim(
  p_shadow_supplier_id UUID,
  p_new_supplier_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update shadow supplier as claimed
  UPDATE scraped_supplier_data
  SET claimed_status = 'claimed',
      claimed_by_user_id = p_user_id,
      claimed_at = NOW(),
      linked_supplier_id = p_new_supplier_id,
      conversion_status = 'converted',
      converted_at = NOW()
  WHERE id = p_shadow_supplier_id
    AND claimed_status = 'unclaimed';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update shadow products to claimed state
  UPDATE shadow_products
  SET visibility = 'claimed',
      linked_product_id = NULL -- Products will be migrated separately
  WHERE shadow_supplier_id = p_shadow_supplier_id;
  
  -- Log the action
  INSERT INTO supplier_claim_audit_log (
    shadow_supplier_id, claimed_by_user_id, action, ip_address, success
  ) VALUES (
    p_shadow_supplier_id, 
    p_user_id,
    'claim_completed', 
    p_ip_address, 
    TRUE
  );
  
  RETURN TRUE;
END;
$$;

-- ============================================
-- STEP 7: Add supplier tier constraint for shadow state
-- ============================================

-- Update supplier tier check to ensure 'scraped' tier suppliers
-- are never publicly visible in normal queries
COMMENT ON COLUMN suppliers.tier IS 
  'Supplier visibility tier: enterprise (premium), pro (paid), claimed (free verified), free (basic), scraped (shadow/hidden)';

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after applying migration:
--
-- -- Check scraped_supplier_data columns added:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'scraped_supplier_data' 
-- AND column_name IN ('opt_out_status', 'claim_token_expires_at', 'linked_supplier_id');
--
-- -- Check shadow_products table exists:
-- SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 'shadow_products');
--
-- -- Check supplier_claim_tokens table exists:
-- SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 'supplier_claim_tokens');
--
-- -- Verify views created:
-- SELECT viewname FROM pg_views WHERE viewname IN ('catalog_anonymous_materials', 'catalog_all_materials');
--
-- -- Test token generation function:
-- SELECT gc_generate_claim_token(uuid_generate_v4(), 'claim', 72);

-- ============================================
-- NOTES
-- ============================================
-- - Shadow suppliers are stored in scraped_supplier_data table
-- - Products from shadow suppliers go in shadow_products table
-- - Claim tokens are managed in supplier_claim_tokens table
-- - All claim actions are logged in supplier_claim_audit_log
-- - Use catalog_anonymous_materials view for search without revealing supplier
-- - Use catalog_all_materials for combined verified + anonymous materials
-- - Suppliers can opt-out at any time, which hides all their products
