-- ============================================
-- GreenChainz: Azure Postgres RFQ Simulator Schema (UUID-based)
-- Target: Azure Database for PostgreSQL (Postgres 15+)
--
-- Why this file exists:
-- - The repo currently contains multiple competing schemas (BIGINT vs UUID).
-- - The backend RFQ distribution + campaign services query UUID tables like:
--     - rfqs(id), suppliers(id), products(id)
--     - "RFQ_Distribution_Queue"
--     - "Supplier_Response_Metrics"
--     - "Supplier_Verification_Scores"
--     - Scraped_Supplier_Data / Missed_RFQs (unquoted identifiers => lowercased)
--     - Notification_Log (used by mailer + tracking)
--
-- This script is idempotent and safe to re-run.
-- ============================================

BEGIN;

-- UUID generation (works on Azure Postgres)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Case-insensitive text (emails, tokens)
CREATE EXTENSION IF NOT EXISTS citext;

-- Optional: useful for text search / typeahead
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- Shared helpers
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Core entities used by RFQ simulator
-- ============================================

-- Suppliers (UUID) - matches backend/services/rfq/*
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email CITEXT,
  description TEXT,
  location TEXT,
  logo_url TEXT,

  -- RFQ distribution fields (tiers + geo)
  tier VARCHAR(50) DEFAULT 'free', -- enterprise, pro, claimed, free, scraped
  latitude DECIMAL(9,6),
  longitude DECIMAL(9,6),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_email_unique
  ON suppliers(email)
  WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_tier ON suppliers(tier);
CREATE INDEX IF NOT EXISTS idx_suppliers_location_trgm ON suppliers USING gin (location gin_trgm_ops);

-- Enterprise-grade: constrain tier values (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_tier_check'
  ) THEN
    ALTER TABLE suppliers
      ADD CONSTRAINT suppliers_tier_check
      CHECK (tier IN ('enterprise','pro','claimed','free','scraped'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_latitude_check'
  ) THEN
    ALTER TABLE suppliers
      ADD CONSTRAINT suppliers_latitude_check
      CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_longitude_check'
  ) THEN
    ALTER TABLE suppliers
      ADD CONSTRAINT suppliers_longitude_check
      CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON suppliers;
CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Products (UUID) - matches backend/services/rfq/matcher.js queries
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  material_type TEXT,
  application TEXT,
  certifications TEXT[],
  sustainability_data JSONB,
  specs JSONB,
  images TEXT[],
  epd_url TEXT,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_material_type ON products(material_type);
CREATE INDEX IF NOT EXISTS idx_products_material_type_supplier_id ON products(material_type, supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_certifications_gin ON products USING GIN (certifications);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RFQs (UUID) - used by distribution + campaigns
CREATE TABLE IF NOT EXISTS rfqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Minimal buyer identity for simulator
  buyer_email CITEXT NOT NULL,

  -- Matching + targeting
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,

  -- Used by campaigns + analytics
  project_name TEXT,
  category TEXT,
  budget NUMERIC,

  -- Free-form + structured detail (location, certifications, etc.)
  message TEXT,
  project_details JSONB,

  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rfqs_created_at ON rfqs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rfqs_status ON rfqs(status);
CREATE INDEX IF NOT EXISTS idx_rfqs_supplier_id ON rfqs(supplier_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_product_id ON rfqs(product_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_category ON rfqs(category);
CREATE INDEX IF NOT EXISTS idx_rfqs_category_created_at ON rfqs(category, created_at DESC);

DROP TRIGGER IF EXISTS trg_rfqs_updated_at ON rfqs;
CREATE TRIGGER trg_rfqs_updated_at
  BEFORE UPDATE ON rfqs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enterprise-grade: constrain RFQ status values (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rfqs_status_check'
  ) THEN
    ALTER TABLE rfqs
      ADD CONSTRAINT rfqs_status_check
      CHECK (status IN ('pending','open','responded','closed','cancelled','expired','archived'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rfqs_budget_nonnegative_check'
  ) THEN
    ALTER TABLE rfqs
      ADD CONSTRAINT rfqs_budget_nonnegative_check
      CHECK (budget IS NULL OR budget >= 0);
  END IF;
END $$;

-- Optional: RFQ responses (not required by distributor, but useful for simulator)
CREATE TABLE IF NOT EXISTS rfq_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MIGRATION: Add new columns if they don't exist
DO $$
BEGIN
  ALTER TABLE rfq_responses ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2);
  ALTER TABLE rfq_responses ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
  ALTER TABLE rfq_responses ADD COLUMN IF NOT EXISTS lead_time_days INTEGER;
  ALTER TABLE rfq_responses ADD COLUMN IF NOT EXISTS min_order_quantity INTEGER;
  ALTER TABLE rfq_responses ADD COLUMN IF NOT EXISTS valid_until DATE;
  ALTER TABLE rfq_responses ADD COLUMN IF NOT EXISTS payment_terms TEXT;
  ALTER TABLE rfq_responses ADD COLUMN IF NOT EXISTS delivery_terms TEXT;
  ALTER TABLE rfq_responses ADD COLUMN IF NOT EXISTS attachments JSONB;
  ALTER TABLE rfq_responses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
END $$;

CREATE INDEX IF NOT EXISTS idx_rfq_responses_rfq_id ON rfq_responses(rfq_id);
CREATE INDEX IF NOT EXISTS idx_rfq_responses_supplier_id ON rfq_responses(supplier_id);

DROP TRIGGER IF EXISTS trg_rfq_responses_updated_at ON rfq_responses;
CREATE TRIGGER trg_rfq_responses_updated_at
  BEFORE UPDATE ON rfq_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enterprise-grade: constrain RFQ response status (idempotent)
DO $$
BEGIN
  -- Always drop old constraint to ensure new values are accepted
  ALTER TABLE rfq_responses DROP CONSTRAINT IF EXISTS rfq_responses_status_check;

  ALTER TABLE rfq_responses
      ADD CONSTRAINT rfq_responses_status_check
      CHECK (status IN ('pending','accepted','declined','submitted','clarification_requested'));

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rfq_responses_price_check'
  ) THEN
    ALTER TABLE rfq_responses
      ADD CONSTRAINT rfq_responses_price_check
      CHECK (price IS NULL OR price >= 0);
  END IF;
END $$;

-- ============================================
-- RFQ distribution (wave-based visibility)
-- NOTE: these table names are quoted in backend code and must match exactly.
-- ============================================

CREATE TABLE IF NOT EXISTS "RFQ_Distribution_Queue" (
  queue_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  wave_number INTEGER NOT NULL,
  visible_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  notified_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pending', -- pending, notified, viewed, responded, expired
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (rfq_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_rfq_dist_queue_rfq_id ON "RFQ_Distribution_Queue"(rfq_id);
CREATE INDEX IF NOT EXISTS idx_rfq_dist_queue_supplier_id ON "RFQ_Distribution_Queue"(supplier_id);
CREATE INDEX IF NOT EXISTS idx_rfq_dist_queue_visible_at ON "RFQ_Distribution_Queue"(visible_at);
CREATE INDEX IF NOT EXISTS idx_rfq_dist_queue_status ON "RFQ_Distribution_Queue"(status);

-- Enterprise-grade: queue correctness + performance (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rfq_distribution_queue_wave_check'
  ) THEN
    ALTER TABLE "RFQ_Distribution_Queue"
      ADD CONSTRAINT rfq_distribution_queue_wave_check
      CHECK (wave_number >= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rfq_distribution_queue_status_check'
  ) THEN
    ALTER TABLE "RFQ_Distribution_Queue"
      ADD CONSTRAINT rfq_distribution_queue_status_check
      CHECK (status IN ('pending','notified','viewed','responded','expired'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rfq_distribution_queue_expires_check'
  ) THEN
    ALTER TABLE "RFQ_Distribution_Queue"
      ADD CONSTRAINT rfq_distribution_queue_expires_check
      CHECK (expires_at IS NULL OR expires_at > visible_at);
  END IF;
END $$;

-- Hot-path indexes for wave runners / inbox reads
CREATE INDEX IF NOT EXISTS idx_rfq_dist_queue_pending_visible
  ON "RFQ_Distribution_Queue"(visible_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_rfq_dist_queue_supplier_status_visible
  ON "RFQ_Distribution_Queue"(supplier_id, status, visible_at);

-- Supplier performance metrics (for ranking)
CREATE TABLE IF NOT EXISTS "Supplier_Response_Metrics" (
  supplier_id UUID PRIMARY KEY REFERENCES suppliers(id) ON DELETE CASCADE,
  response_rate DECIMAL(5,2) DEFAULT 0.0,
  avg_response_time_minutes INTEGER DEFAULT 0,
  win_rate DECIMAL(5,2) DEFAULT 0.0,
  total_rfqs_received INTEGER DEFAULT 0,
  total_responses INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Enterprise-grade: constrain metrics ranges (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'supplier_response_metrics_response_rate_check'
  ) THEN
    ALTER TABLE "Supplier_Response_Metrics"
      ADD CONSTRAINT supplier_response_metrics_response_rate_check
      CHECK (response_rate >= 0 AND response_rate <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'supplier_response_metrics_win_rate_check'
  ) THEN
    ALTER TABLE "Supplier_Response_Metrics"
      ADD CONSTRAINT supplier_response_metrics_win_rate_check
      CHECK (win_rate >= 0 AND win_rate <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'supplier_response_metrics_avg_response_time_check'
  ) THEN
    ALTER TABLE "Supplier_Response_Metrics"
      ADD CONSTRAINT supplier_response_metrics_avg_response_time_check
      CHECK (avg_response_time_minutes >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'supplier_response_metrics_totals_check'
  ) THEN
    ALTER TABLE "Supplier_Response_Metrics"
      ADD CONSTRAINT supplier_response_metrics_totals_check
      CHECK (
        total_rfqs_received >= 0
        AND total_responses >= 0
        AND total_responses <= total_rfqs_received
      );
  END IF;
END $$;

-- Verification scores (for ranking)
CREATE TABLE IF NOT EXISTS "Supplier_Verification_Scores" (
  supplier_id UUID PRIMARY KEY REFERENCES suppliers(id) ON DELETE CASCADE,
  verification_score INTEGER DEFAULT 0, -- 0-100
  verified_by_admin_id UUID,
  verification_date TIMESTAMPTZ,
  details JSONB
);

-- Enterprise-grade: constrain verification score range (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'supplier_verification_scores_range_check'
  ) THEN
    ALTER TABLE "Supplier_Verification_Scores"
      ADD CONSTRAINT supplier_verification_scores_range_check
      CHECK (verification_score >= 0 AND verification_score <= 100);
  END IF;
END $$;

-- ============================================
-- Scraped supplier growth loop (missed RFQ emails + claim flow)
-- NOTE: backend code uses unquoted identifiers "Scraped_Supplier_Data" and "Missed_RFQs"
-- which Postgres lowercases => scraped_supplier_data / missed_rfqs.
-- ============================================

CREATE TABLE IF NOT EXISTS scraped_supplier_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  email CITEXT NOT NULL,
  category TEXT,

  claimed_status TEXT DEFAULT 'unclaimed', -- claimed/unclaimed
  claim_token TEXT,
  claimed_by_user_id UUID,
  claimed_at TIMESTAMPTZ,

  conversion_status TEXT DEFAULT 'unconverted', -- converted/unconverted
  converted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_scraped_supplier_data_email_unique ON scraped_supplier_data(email);
CREATE INDEX IF NOT EXISTS idx_scraped_supplier_data_claimed_status ON scraped_supplier_data(claimed_status);
CREATE INDEX IF NOT EXISTS idx_scraped_supplier_data_category ON scraped_supplier_data(category);
CREATE UNIQUE INDEX IF NOT EXISTS idx_scraped_supplier_data_claim_token_unique
  ON scraped_supplier_data(claim_token)
  WHERE claim_token IS NOT NULL;

DROP TRIGGER IF EXISTS trg_scraped_supplier_data_updated_at ON scraped_supplier_data;
CREATE TRIGGER trg_scraped_supplier_data_updated_at
  BEFORE UPDATE ON scraped_supplier_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enterprise-grade: constrain growth-loop status fields (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scraped_supplier_data_claimed_status_check'
  ) THEN
    ALTER TABLE scraped_supplier_data
      ADD CONSTRAINT scraped_supplier_data_claimed_status_check
      CHECK (claimed_status IN ('unclaimed','claimed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scraped_supplier_data_conversion_status_check'
  ) THEN
    ALTER TABLE scraped_supplier_data
      ADD CONSTRAINT scraped_supplier_data_conversion_status_check
      CHECK (conversion_status IN ('unconverted','converted'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS missed_rfqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES scraped_supplier_data(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_missed_rfqs_supplier_id ON missed_rfqs(supplier_id, sent_at DESC);

-- ============================================
-- Notification log (mailer + tracking)
-- backend/services/mailer.js inserts NotificationType/Recipient/Subject/MessageBody/Status/ErrorMessage
-- backend/services/campaigns/tracking.js updates opened_at/clicked_at/metadata by id
-- ============================================

-- IMPORTANT:
-- The backend queries `Notification_Log` WITHOUT quotes.
-- In Postgres, that resolves to the lowercased identifier: notification_log.
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notificationtype VARCHAR(100) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  messagebody TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  errormessage TEXT,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enterprise-grade: constrain notification statuses used by mailer + tracking (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notification_log_status_check'
  ) THEN
    ALTER TABLE notification_log
      ADD CONSTRAINT notification_log_status_check
      CHECK (status IN ('pending','sent','failed','skipped','opened'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notification_log_recipient ON notification_log(recipient);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);
CREATE INDEX IF NOT EXISTS idx_notification_log_type ON notification_log(notificationtype);
CREATE INDEX IF NOT EXISTS idx_notification_log_created_at ON notification_log(created_at DESC);

-- Optional compatibility view for humans (only if quoted table doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'Notification_Log' AND c.relkind = 'r'
  ) THEN
    EXECUTE 'CREATE OR REPLACE VIEW "Notification_Log" AS SELECT * FROM notification_log';
  END IF;
END $$;

-- ============================================
-- Concurrency-safe helpers (enterprise correctness)
-- ============================================

-- Atomically mark a queue entry as notified (safe under concurrency)
CREATE OR REPLACE FUNCTION gc_mark_queue_notified(p_rfq_id UUID, p_supplier_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  updated_rows INTEGER;
BEGIN
  UPDATE "RFQ_Distribution_Queue"
  SET notified_at = NOW(),
      status = 'notified'
  WHERE rfq_id = p_rfq_id
    AND supplier_id = p_supplier_id
    AND status = 'pending'
    AND visible_at <= NOW()
    AND (expires_at IS NULL OR expires_at > NOW());

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows = 1;
END;
$$;

-- Atomically mark a queue entry as responded
CREATE OR REPLACE FUNCTION gc_mark_queue_responded(p_rfq_id UUID, p_supplier_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  updated_rows INTEGER;
BEGIN
  UPDATE "RFQ_Distribution_Queue"
  SET responded_at = NOW(),
      status = 'responded'
  WHERE rfq_id = p_rfq_id
    AND supplier_id = p_supplier_id
    AND status IN ('pending','notified','viewed')
    AND visible_at <= NOW()
    AND (expires_at IS NULL OR expires_at > NOW());

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows >= 1;
END;
$$;

-- Claim and mark due notifications in a single atomic statement.
-- This is safe for multiple concurrent workers (uses SKIP LOCKED).
CREATE OR REPLACE FUNCTION gc_claim_due_notifications(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  rfq_id UUID,
  supplier_id UUID,
  wave_number INTEGER,
  visible_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
)
LANGUAGE sql
AS $$
  WITH due AS (
    SELECT q.rfq_id, q.supplier_id
    FROM "RFQ_Distribution_Queue" q
    WHERE q.status = 'pending'
      AND q.visible_at <= NOW()
      AND (q.expires_at IS NULL OR q.expires_at > NOW())
    ORDER BY q.visible_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(p_limit, 0)
  )
  UPDATE "RFQ_Distribution_Queue" q
  SET notified_at = NOW(),
      status = 'notified'
  FROM due
  WHERE q.rfq_id = due.rfq_id
    AND q.supplier_id = due.supplier_id
  RETURNING q.rfq_id, q.supplier_id, q.wave_number, q.visible_at, q.expires_at;
$$;

-- Expire queue entries that are past their expiry time.
CREATE OR REPLACE FUNCTION gc_expire_queue_entries()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  updated_rows INTEGER;
BEGIN
  UPDATE "RFQ_Distribution_Queue"
  SET status = 'expired'
  WHERE status IN ('pending','notified','viewed')
    AND expires_at IS NOT NULL
    AND expires_at <= NOW();

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows;
END;
$$;

-- Supplier inbox view (what's visible "now")
CREATE OR REPLACE VIEW rfq_supplier_inbox AS
SELECT
  q.supplier_id,
  q.rfq_id,
  q.wave_number,
  q.visible_at,
  q.expires_at,
  q.status AS queue_status,
  r.project_name,
  r.category,
  r.budget,
  r.created_at AS rfq_created_at
FROM "RFQ_Distribution_Queue" q
JOIN rfqs r ON r.id = q.rfq_id
WHERE q.visible_at <= NOW()
  AND (q.expires_at IS NULL OR q.expires_at > NOW());

COMMIT;

