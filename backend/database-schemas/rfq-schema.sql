-- ============================================
-- RFQ System Schema
-- GreenChainz B2B Marketplace - Core RFQ Feature
-- ============================================
-- This schema creates the simplified RFQ system tables
-- for architects to request quotes and suppliers to respond.
-- RFQs table
CREATE TABLE IF NOT EXISTS rfqs (
    id SERIAL PRIMARY KEY,
    architect_id INTEGER REFERENCES Users(id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    project_location VARCHAR(255),
    project_timeline VARCHAR(100),
    material_type VARCHAR(255),
    quantity VARCHAR(100),
    specifications TEXT,
    certifications_required TEXT [],
    budget_range VARCHAR(100),
    status VARCHAR(50) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deadline TIMESTAMP
);
-- RFQ Responses table
CREATE TABLE IF NOT EXISTS rfq_responses (
    id SERIAL PRIMARY KEY,
    rfq_id INTEGER REFERENCES rfqs(id) ON DELETE CASCADE,
    supplier_id INTEGER REFERENCES Users(id) ON DELETE CASCADE,
    message TEXT,
    quoted_price DECIMAL(10, 2),
    delivery_timeline VARCHAR(100),
    certifications_provided TEXT [],
    attachments JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rfqs_architect ON rfqs(architect_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_status ON rfqs(status);
CREATE INDEX IF NOT EXISTS idx_rfqs_deadline ON rfqs(deadline);
CREATE INDEX IF NOT EXISTS idx_rfq_responses_rfq ON rfq_responses(rfq_id);
CREATE INDEX IF NOT EXISTS idx_rfq_responses_supplier ON rfq_responses(supplier_id);
CREATE INDEX IF NOT EXISTS idx_rfq_responses_status ON rfq_responses(status);
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_rfq_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER update_rfqs_updated_at BEFORE
UPDATE ON rfqs FOR EACH ROW EXECUTE FUNCTION update_rfq_updated_at();
CREATE TRIGGER update_rfq_responses_updated_at BEFORE
UPDATE ON rfq_responses FOR EACH ROW EXECUTE FUNCTION update_rfq_updated_at();