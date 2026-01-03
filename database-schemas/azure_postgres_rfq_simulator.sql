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
  email TEXT,
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
  buyer_email TEXT NOT NULL,

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

DROP TRIGGER IF EXISTS trg_rfqs_updated_at ON rfqs;
CREATE TRIGGER trg_rfqs_updated_at
  BEFORE UPDATE ON rfqs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Optional: RFQ responses (not required by distributor, but useful for simulator)
CREATE TABLE IF NOT EXISTS rfq_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rfq_responses_rfq_id ON rfq_responses(rfq_id);
CREATE INDEX IF NOT EXISTS idx_rfq_responses_supplier_id ON rfq_responses(supplier_id);

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

-- Verification scores (for ranking)
CREATE TABLE IF NOT EXISTS "Supplier_Verification_Scores" (
  supplier_id UUID PRIMARY KEY REFERENCES suppliers(id) ON DELETE CASCADE,
  verification_score INTEGER DEFAULT 0, -- 0-100
  verified_by_admin_id UUID,
  verification_date TIMESTAMPTZ,
  details JSONB
);

-- ============================================
-- Scraped supplier growth loop (missed RFQ emails + claim flow)
-- NOTE: backend code uses unquoted identifiers "Scraped_Supplier_Data" and "Missed_RFQs"
-- which Postgres lowercases => scraped_supplier_data / missed_rfqs.
-- ============================================

CREATE TABLE IF NOT EXISTS scraped_supplier_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  email TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS missed_rfqs (
  id BIGSERIAL PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES scraped_supplier_data(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_missed_rfqs_supplier_id ON missed_rfqs(supplier_id, sent_at DESC);

-- ============================================
-- Notification log (mailer + tracking)
-- backend/services/mailer.js inserts NotificationType/Recipient/Subject/MessageBody/Status/ErrorMessage
-- backend/services/campaigns/tracking.js updates opened_at/clicked_at/metadata by id
-- ============================================

CREATE TABLE IF NOT EXISTS "Notification_Log" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "NotificationType" VARCHAR(100) NOT NULL,
  "Recipient" VARCHAR(255) NOT NULL,
  "Subject" VARCHAR(500),
  "MessageBody" TEXT,
  "Status" VARCHAR(50) DEFAULT 'pending',
  "ErrorMessage" TEXT,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_log_recipient ON "Notification_Log"("Recipient");
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON "Notification_Log"("Status");
CREATE INDEX IF NOT EXISTS idx_notification_log_type ON "Notification_Log"("NotificationType");
CREATE INDEX IF NOT EXISTS idx_notification_log_created_at ON "Notification_Log"(created_at DESC);

COMMIT;

