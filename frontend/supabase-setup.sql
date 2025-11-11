-- GreenChainz Products Table for Supabase
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  supplier_id BIGINT,
  material_type TEXT,
  category TEXT,
  sku TEXT,
  unit_price DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  lead_time_days INTEGER,
  sustainability_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for MVP - tighten later)
CREATE POLICY "Products are publicly readable"
  ON products
  FOR SELECT
  USING (true);

-- Allow authenticated users to insert (for suppliers)
CREATE POLICY "Authenticated users can insert products"
  ON products
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update their own products
CREATE POLICY "Users can update their own products"
  ON products
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_material ON products(material_type);
CREATE INDEX IF NOT EXISTS idx_products_created ON products(created_at DESC);

-- Add some sample data
INSERT INTO products (name, description, material_type, category, unit_price, sustainability_data) VALUES
  (
    'FSC-Certified Oak Flooring',
    'Premium engineered hardwood flooring with FSC Chain of Custody certification',
    'Wood',
    'Flooring',
    45.50,
    '{"gwp_fossil": 12.5, "certifications": ["FSC-CoC"], "recycled_content": 0}'::jsonb
  ),
  (
    'Bamboo Composite Panels',
    'Rapidly renewable bamboo panels for interior applications',
    'Bamboo',
    'Panels',
    32.00,
    '{"gwp_fossil": 8.2, "certifications": ["FSC"], "recycled_content": 0, "renewable": true}'::jsonb
  ),
  (
    'Recycled Steel Framing',
    'Structural steel framing with 90% recycled content',
    'Metal',
    'Structural',
    28.75,
    '{"gwp_fossil": 45.0, "certifications": [], "recycled_content": 90}'::jsonb
  ),
  (
    'Low-VOC Interior Paint',
    'Zero-VOC interior paint with GreenGuard Gold certification',
    'Paint',
    'Finishes',
    65.00,
    '{"gwp_fossil": 2.1, "certifications": ["GreenGuard Gold"], "recycled_content": 0, "voc_level": "zero"}'::jsonb
  ),
  (
    'Cork Underlayment',
    'Sustainable cork underlayment for flooring applications',
    'Cork',
    'Flooring',
    18.50,
    '{"gwp_fossil": 5.5, "certifications": ["FSC"], "recycled_content": 0, "renewable": true}'::jsonb
  );

-- Verify data
SELECT * FROM products;
