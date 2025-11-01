-- GreenChainz Database Schema
-- Initial schema for sustainable sourcing B2B platform

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    country VARCHAR(100),
    sustainability_rating INTEGER CHECK (sustainability_rating >= 0 AND sustainability_rating <= 100),
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    sustainability_score INTEGER CHECK (sustainability_score >= 0 AND sustainability_score <= 100),
    certifications TEXT[],
    price DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create certifications table
CREATE TABLE IF NOT EXISTS certifications (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
    certification_type VARCHAR(100) NOT NULL,
    issuing_body VARCHAR(255),
    issue_date DATE,
    expiry_date DATE,
    certificate_url TEXT,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email);
CREATE INDEX IF NOT EXISTS idx_suppliers_verified ON suppliers(verified);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_certifications_supplier ON certifications(supplier_id);

-- Insert sample data for testing
INSERT INTO suppliers (name, email, contact_person, phone, country, sustainability_rating, verified)
VALUES 
    ('GreenTech Solutions', 'contact@greentech.example', 'John Doe', '+1-555-0100', 'USA', 85, TRUE),
    ('EcoSupply Co', 'info@ecosupply.example', 'Jane Smith', '+44-20-7946-0958', 'UK', 92, TRUE),
    ('Sustainable Materials Inc', 'hello@sustain.example', 'Bob Johnson', '+49-30-12345', 'Germany', 78, FALSE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO products (supplier_id, name, description, category, sustainability_score, certifications, price, currency)
VALUES 
    (1, 'Recycled Plastic Pellets', 'High-quality recycled plastic pellets for manufacturing', 'Materials', 90, ARRAY['ISO 14001', 'Ocean Plastic Certification'], 2.50, 'USD'),
    (2, 'Organic Cotton Fabric', 'GOTS certified organic cotton fabric', 'Textiles', 95, ARRAY['GOTS', 'Fair Trade'], 15.00, 'USD'),
    (3, 'Bamboo Fiber Sheets', 'Sustainable bamboo fiber sheets', 'Materials', 88, ARRAY['FSC'], 8.75, 'EUR')
ON CONFLICT DO NOTHING;
