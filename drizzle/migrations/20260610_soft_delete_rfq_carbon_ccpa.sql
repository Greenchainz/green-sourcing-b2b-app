-- Migration: 20260610_soft_delete_rfq_carbon_ccpa
-- Addresses three open ledger issues:
--   20260522-019  Soft-delete columns on rfqs/rfq_bids/rfq_items (7-year retention)
--   20260522-020  dataSubjectRequests table for CCPA/GDPR compliance
--   20260522-021  First-class carbon/sustainability gate fields on rfqs + rfq_bids

-- ── Issue 20260522-019: Soft-delete support ──────────────────────────────────

ALTER TABLE rfqs
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE rfq_bids
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE rfq_items
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Partial indexes speed up the common case of filtering out deleted rows.
CREATE INDEX IF NOT EXISTS idx_rfqs_not_deleted
  ON rfqs (id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_rfq_bids_not_deleted
  ON rfq_bids (id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_rfq_items_not_deleted
  ON rfq_items (id) WHERE deleted_at IS NULL;

-- ── Issue 20260522-021: First-class carbon gate fields ───────────────────────

-- rfqs: hard GWP cap + EPD gate + buyer reduction target
ALTER TABLE rfqs
  ADD COLUMN IF NOT EXISTS gwp_cap_per_unit    NUMERIC(10, 4),
  ADD COLUMN IF NOT EXISTS gwp_cap_unit        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS gwp_reduction_target NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS epd_required        BOOLEAN NOT NULL DEFAULT FALSE;

-- rfq_bids: computed compliance flag (set server-side on bid submission)
ALTER TABLE rfq_bids
  ADD COLUMN IF NOT EXISTS gwp_meets_target BOOLEAN;

-- ── Issue 20260522-020: CCPA / GDPR data subject requests ───────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'data_subject_request_type') THEN
    CREATE TYPE data_subject_request_type AS ENUM ('access', 'correction', 'deletion');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'data_subject_request_status') THEN
    CREATE TYPE data_subject_request_status AS ENUM ('pending', 'in_progress', 'completed', 'rejected');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS data_subject_requests (
  id                      SERIAL PRIMARY KEY,
  requested_by_admin_id   INTEGER,
  target_user_id          INTEGER NOT NULL,
  type                    data_subject_request_type NOT NULL,
  status                  data_subject_request_status NOT NULL DEFAULT 'pending',
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dsr_target_user
  ON data_subject_requests (target_user_id);

CREATE INDEX IF NOT EXISTS idx_dsr_status
  ON data_subject_requests (status);
