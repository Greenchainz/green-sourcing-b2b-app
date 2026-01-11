-- ============================================
-- GreenChainz Database Schema
-- PostgreSQL 15+
-- ============================================

-- Users table (base for auth)
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'Buyer', -- 'Buyer', 'Supplier', 'Admin'
    azure_id VARCHAR(255) UNIQUE, -- Linked to Azure AD
    company_id INTEGER,
    last_login TIMESTAMP,
    reset_token VARCHAR(255),
    reset_token_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_azure_id ON users(azure_id);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
    company_id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    website VARCHAR(255),
    industry VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_companies_name ON companies(company_name);

-- Link User to Company
ALTER TABLE users ADD CONSTRAINT fk_users_company 
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE SET NULL;

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL UNIQUE,
    website_domain VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE
);

CREATE INDEX idx_suppliers_company ON suppliers(company_id);

-- Supplier Profiles (extended supplier data)
CREATE TABLE IF NOT EXISTS supplier_profiles (
    profile_id SERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL UNIQUE,
    user_id INTEGER, -- The primary admin user for this profile
    description TEXT,
    esg_summary TEXT,
    claim_token VARCHAR(255),
    is_claimed BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Buyers table (extends Users with Buyer-specific data)
CREATE TABLE IF NOT EXISTS buyers (
    buyer_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    company_id INTEGER,
    job_title VARCHAR(100),
    project_types TEXT, -- JSON array or comma-separated
    preferred_contact_method VARCHAR(50) DEFAULT 'Email',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE SET NULL
);

CREATE INDEX idx_buyers_user ON buyers(user_id);
CREATE INDEX idx_buyers_company ON buyers(company_id);

-- Certifications (standard certifications)
CREATE TABLE IF NOT EXISTS certifications (
    certification_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    certifying_body VARCHAR(255),
    UNIQUE(name, certifying_body)
);

-- Supplier Certifications (supplier's certs)
CREATE TABLE IF NOT EXISTS supplier_certifications (
    supplier_certification_id SERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL,
    certification_id INTEGER NOT NULL,
    certificate_number VARCHAR(255),
    issue_date DATE,
    expiry_date DATE,
    status VARCHAR(50) DEFAULT 'Valid', -- 'Valid', 'Expired', 'Pending'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
    FOREIGN KEY (certification_id) REFERENCES certifications(certification_id) ON DELETE CASCADE
);

CREATE INDEX idx_supplier_certs_supplier ON supplier_certifications(supplier_id);
CREATE INDEX idx_supplier_certs_cert ON supplier_certifications(certification_id);

-- Products (building materials)
CREATE TABLE IF NOT EXISTS products (
    product_id SERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100), -- 'Wood', 'Steel', 'Concrete', etc.
    description TEXT,
    unit VARCHAR(50), -- 'ton', 'board-foot', 'sqm', etc.
    price_per_unit DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    source_type VARCHAR(50) DEFAULT 'Scraped', -- 'Scraped', 'Manual', 'BulkUpload'
    verification_status VARCHAR(50) DEFAULT 'Unverified',
    gwp_kgco2e DECIMAL(10,2), -- Carbon footprint cache
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE CASCADE
);

CREATE INDEX idx_products_supplier ON products(supplier_id);
CREATE INDEX idx_products_category ON products(category);

-- RFQs (Request for Quote - buyer initiated)
CREATE TABLE IF NOT EXISTS rfqs (
    rfq_id SERIAL PRIMARY KEY,
    buyer_id INTEGER NOT NULL,
    supplier_id INTEGER NOT NULL,
    product_id INTEGER,
    project_name VARCHAR(255),
    message TEXT,
    quantity_needed DECIMAL(10, 2),
    unit VARCHAR(50),
    budget_range VARCHAR(100), -- e.g., "$1000-$5000"
    deadline_date DATE,
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Responded', 'Accepted', 'Cancelled', 'Expired'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES buyers(buyer_id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL
);

CREATE INDEX idx_rfqs_buyer ON rfqs(buyer_id);
CREATE INDEX idx_rfqs_supplier ON rfqs(supplier_id);
CREATE INDEX idx_rfqs_status ON rfqs(status);
CREATE INDEX idx_rfqs_created ON rfqs(created_at);

-- RFQ Responses (supplier's quotes)
CREATE TABLE IF NOT EXISTS rfq_responses (
    response_id SERIAL PRIMARY KEY,
    rfq_id INTEGER NOT NULL,
    supplier_id INTEGER NOT NULL,
    quoted_price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    lead_time_days INTEGER,
    message TEXT,
    attachment_urls TEXT[], -- Array of URLs
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Accepted', 'Declined'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rfq_id) REFERENCES rfqs(rfq_id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE CASCADE
);

CREATE INDEX idx_rfq_responses_rfq ON rfq_responses(rfq_id);
CREATE INDEX idx_rfq_responses_supplier ON rfq_responses(supplier_id);
CREATE INDEX idx_rfq_responses_status ON rfq_responses(status);

-- Supplier Verification Scores (cached)
CREATE TABLE IF NOT EXISTS supplier_verification_scores (
    score_id SERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL UNIQUE,
    score DECIMAL(5, 2), -- 0-100
    certifications INTEGER DEFAULT 0,
    response_rate DECIMAL(5, 2) DEFAULT 0,
    quote_accuracy DECIMAL(5, 2) DEFAULT 0,
    on_time_delivery DECIMAL(5, 2) DEFAULT 0,
    last_computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE CASCADE
);

CREATE INDEX idx_verification_scores_supplier ON supplier_verification_scores(supplier_id);

-- Analytics (Profile Views & Interactions)
CREATE TABLE IF NOT EXISTS analytics_events (
    event_id SERIAL PRIMARY KEY,
    supplier_id INTEGER,
    event_type VARCHAR(50), -- 'ProfileView', 'ProductClick', 'ContactReveal'
    visitor_role VARCHAR(50), -- 'Architect', 'Guest'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE CASCADE
);

CREATE INDEX idx_analytics_supplier ON analytics_events(supplier_id);

-- RFQ Messages (Chat System)
CREATE TABLE IF NOT EXISTS rfq_messages (
    message_id SERIAL PRIMARY KEY,
    rfq_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL, -- Supplier or Buyer (UserID)
    content TEXT NOT NULL,
    has_attachment BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rfq_id) REFERENCES rfqs(rfq_id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Notification Log
CREATE TABLE IF NOT EXISTS notification_log (
    notification_id SERIAL PRIMARY KEY,
    notification_type VARCHAR(100),
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    message_body TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP
);

CREATE INDEX idx_notifications_recipient ON notification_log(recipient);
CREATE INDEX idx_notifications_status ON notification_log(status);

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_profiles_updated_at BEFORE UPDATE ON supplier_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_buyers_updated_at BEFORE UPDATE ON buyers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rfqs_updated_at BEFORE UPDATE ON rfqs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rfq_responses_updated_at BEFORE UPDATE ON rfq_responses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
