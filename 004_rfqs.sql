CREATE TABLE IF NOT EXISTS rfqs (
    rfq_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    architect_user_id UUID NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    project_location VARCHAR(255),
    target_leed_certification VARCHAR(50),
    estimated_budget DECIMAL(15,2),
    submission_deadline TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rfq_line_items (
    line_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_id UUID NOT NULL REFERENCES rfqs(rfq_id) ON DELETE CASCADE,
    material_category VARCHAR(100) NOT NULL,
    specification TEXT,
    quantity DECIMAL(15,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    max_gwp_threshold DECIMAL(10,4),
    required_certifications JSONB,
    priority VARCHAR(50) DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rfq_responses (
    response_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_id UUID NOT NULL REFERENCES rfqs(rfq_id) ON DELETE CASCADE,
    line_item_id UUID NOT NULL REFERENCES rfq_line_items(line_item_id),
    supplier_user_id UUID NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_description TEXT,
    product_gwp DECIMAL(10,4),
    unit_price DECIMAL(15,2) NOT NULL,
    lead_time_days INTEGER,
    certifications_provided JSONB,
    epd_url VARCHAR(500),
    datasheet_url VARCHAR(500),
    proposal_notes TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    submitted_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rfq_messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_id UUID NOT NULL REFERENCES rfqs(rfq_id) ON DELETE CASCADE,
    response_id UUID REFERENCES rfq_responses(response_id),
    sender_user_id UUID NOT NULL,
    message_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rfq_architect_status ON rfqs(architect_user_id, status);
CREATE INDEX IF NOT EXISTS idx_rfq_deadline ON rfqs(submission_deadline, status);
CREATE INDEX IF NOT EXISTS idx_rfq_created ON rfqs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_line_item_rfq ON rfq_line_items(rfq_id);
CREATE INDEX IF NOT EXISTS idx_response_rfq ON rfq_responses(rfq_id, status);
CREATE INDEX IF NOT EXISTS idx_response_supplier ON rfq_responses(supplier_user_id, status);
