-- =====================================================
-- RFQ MARKETPLACE LIFECYCLE — POSTGRESQL
-- =====================================================
-- Supports the full RFQ lifecycle: buyers create RFQs,
-- invite suppliers, suppliers submit quotes, buyers
-- accept a winning quote, and overdue RFQs auto-expire.
-- =====================================================

-- ── Core RFQ table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  material_category VARCHAR(100),
  quantity NUMERIC NOT NULL,
  unit VARCHAR(50) NOT NULL,
  delivery_location TEXT,
  deadline TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'open',  -- open, awarded, expired, cancelled
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Invited suppliers junction ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rfq_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  supplier_id INTEGER NOT NULL,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(rfq_id, supplier_id)
);

-- ── Quotes from suppliers ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rfq_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  supplier_id INTEGER NOT NULL,
  price_per_unit NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  lead_time_days INTEGER NOT NULL,
  notes TEXT,
  is_accepted BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(rfq_id, supplier_id)
);

-- ── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_rfqs_buyer_id ON rfqs(buyer_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_status ON rfqs(status);
CREATE INDEX IF NOT EXISTS idx_rfqs_deadline ON rfqs(deadline);
CREATE INDEX IF NOT EXISTS idx_rfq_suppliers_supplier_id ON rfq_suppliers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_rfq_quotes_rfq_id ON rfq_quotes(rfq_id);
