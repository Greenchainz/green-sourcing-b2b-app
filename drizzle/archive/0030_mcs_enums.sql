-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0030: Enum prerequisites for Material Credit Score v2.
--
-- Postgres requires that ALTER TYPE ADD VALUE be COMMITTED before the new
-- value can be used in the same transaction. So every enum change lives in
-- this file alone; column adds + table creates that depend on these enums
-- live in 0031_mcs_tables.sql.
--
-- Safe to re-run (ADD VALUE IF NOT EXISTS + DO/EXCEPTION blocks).
-- ─────────────────────────────────────────────────────────────────────────────

-- Expand existing tier enums to the full 4-tier paywall.
ALTER TYPE supplier_tier ADD VALUE IF NOT EXISTS 'basic';
ALTER TYPE supplier_tier ADD VALUE IF NOT EXISTS 'standard';
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'basic';

-- Persona for CCPS weighting.
DO $$ BEGIN
  CREATE TYPE architect_persona AS ENUM (
    'aor', 'leed_ap', 'gc_pm', 'spec_writer', 'interior_designer'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Status for an architect-uploaded PDF/Excel spec.
DO $$ BEGIN
  CREATE TYPE spec_parse_status AS ENUM (
    'pending', 'processing', 'ready', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Supplier-side RFQ activity (drives SRS response-time score).
DO $$ BEGIN
  CREATE TYPE rfq_event_type AS ENUM (
    'viewed', 'responded', 'declined', 'completed', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Reason codes for the lead-credit ledger.
DO $$ BEGIN
  CREATE TYPE lead_credit_reason AS ENUM (
    'monthly_grant', 'tier_upgrade_bonus', 'referral_bonus',
    'rfq_unlock', 'architect_contact_unlock', 'admin_adjustment',
    'company_of_week_bonus', 'top_responder_bonus'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;
