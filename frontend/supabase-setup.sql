-- MVP Database Schema (Supabase PostgreSQL)

-- Users Table (Buyers + Suppliers)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
fix/add-data-provider-signup
  role TEXT NOT NULL CHECK (role IN ('buyer', 'supplier', 'admin', 'data_provider')),
fix/add-data-provider-signup


  
main
  role TEXT NOT NULL CHECK (role IN ('buyer', 'supplier', 'admin')),
 main
  company_name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Products Table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  technical_specs JSONB, -- Flexible field for varied specs
  certifications TEXT[], -- Array of certification names
  epd_link TEXT,
  gwp NUMERIC, -- Global Warming Potential (kg CO2e)
  recycled_content_percent NUMERIC,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- RFQs Table
CREATE TABLE rfqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID REFERENCES users(id),
  product_id UUID REFERENCES products(id),
  project_name TEXT,
  quantity INTEGER,
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Certifications Master Table (Optional but recommended)
CREATE TABLE certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL, -- e.g., "LEED", "FSC", "BREEAM"
  issuing_body TEXT,
  description TEXT
);
