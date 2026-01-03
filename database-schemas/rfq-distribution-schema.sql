-- database-schemas/rfq-distribution-schema.sql

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure Suppliers table has necessary columns for distribution logic
-- Note: Assuming Suppliers table exists (from mvp_schema.sql)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='tier') THEN
        ALTER TABLE suppliers ADD COLUMN tier VARCHAR(50) DEFAULT 'free'; -- enterprise, pro, claimed, free, scraped
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='latitude') THEN
        ALTER TABLE suppliers ADD COLUMN latitude DECIMAL(9,6);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='longitude') THEN
        ALTER TABLE suppliers ADD COLUMN longitude DECIMAL(9,6);
    END IF;
END $$;

-- Table: Supplier_Response_Metrics
-- Tracks performance metrics for scoring
CREATE TABLE IF NOT EXISTS Supplier_Response_Metrics (
    supplier_id UUID PRIMARY KEY REFERENCES suppliers(id) ON DELETE CASCADE,
    response_rate DECIMAL(5,2) DEFAULT 0.0,
    avg_response_time_minutes INTEGER DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0.0,
    total_rfqs_received INTEGER DEFAULT 0,
    total_responses INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Table: Supplier_Verification_Scores
-- detailed verification data
CREATE TABLE IF NOT EXISTS Supplier_Verification_Scores (
    supplier_id UUID PRIMARY KEY REFERENCES suppliers(id) ON DELETE CASCADE,
    verification_score INTEGER DEFAULT 0, -- 0-100
    verified_by_admin_id UUID,
    verification_date TIMESTAMPTZ,
    details JSONB
);

-- Table: RFQ_Distribution_Queue
-- Manages the wave-based distribution of RFQs
CREATE TABLE IF NOT EXISTS RFQ_Distribution_Queue (
    queue_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    wave_number INTEGER NOT NULL, -- 1, 2, 3, 4
    visible_at TIMESTAMPTZ NOT NULL, -- When supplier can see it
    expires_at TIMESTAMPTZ, -- When it expires for them (optional)
    notified_at TIMESTAMPTZ, -- When notification was sent
    responded_at TIMESTAMPTZ, -- When supplier responded
    status VARCHAR(20) DEFAULT 'pending', -- pending, notified, viewed, responded, expired
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(rfq_id, supplier_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rfq_dist_queue_rfq_id ON RFQ_Distribution_Queue(rfq_id);
CREATE INDEX IF NOT EXISTS idx_rfq_dist_queue_supplier_id ON RFQ_Distribution_Queue(supplier_id);
CREATE INDEX IF NOT EXISTS idx_rfq_dist_queue_visible_at ON RFQ_Distribution_Queue(visible_at);
