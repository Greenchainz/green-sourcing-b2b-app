-- Swap Validation Engine - PostgreSQL Migration
-- Tables: material_technical_specs, swap_validations, material_assembly_specs, assembly_spec_components, pricing_data

-- Material Technical Specs
CREATE TABLE IF NOT EXISTS material_technical_specs (
  id SERIAL PRIMARY KEY,
  material_id INTEGER NOT NULL,
  astm_codes TEXT, -- JSON array
  fire_rating VARCHAR(50),
  compressive_strength_psi DECIMAL(10,2),
  tensile_strength_psi DECIMAL(10,2),
  modulus_of_elasticity_psi DECIMAL(12,2),
  r_value_per_inch DECIMAL(5,2),
  perm_rating DECIMAL(5,2),
  stc_rating INTEGER,
  nrc_coefficient DECIMAL(3,2),
  certifications TEXT, -- JSON array
  warranty_years INTEGER,
  install_method VARCHAR(100),
  dimensional_tolerance_inches DECIMAL(5,3),
  weight_per_sf DECIMAL(8,2),
  moisture_absorption_pct DECIMAL(5,2),
  recycled_content_pct DECIMAL(5,2),
  voc_grams_per_liter DECIMAL(6,2),
  expected_lifespan_years INTEGER,
  gwp_per_unit DECIMAL(10,4),
  gwp_unit VARCHAR(50),
  epd_url TEXT,
  epd_expiry TIMESTAMP,
  data_source VARCHAR(100),
  data_confidence DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tech_specs_material ON material_technical_specs(material_id);

-- Swap Validations
CREATE TABLE IF NOT EXISTS swap_validations (
  id SERIAL PRIMARY KEY,
  incumbent_material_id INTEGER NOT NULL,
  sustainable_material_id INTEGER NOT NULL,
  validation_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  overall_score DECIMAL(5,2),
  showstopper_results JSONB,
  failed_checks INTEGER DEFAULT 0,
  passed_checks INTEGER DEFAULT 0,
  skipped_checks INTEGER DEFAULT 0,
  recommendation TEXT,
  validated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP,
  project_state VARCHAR(2),
  project_city VARCHAR(100),
  project_type VARCHAR(100),
  csi_form_url TEXT,
  csi_form_generated_at TIMESTAMP,
  requested_by INTEGER,
  rfq_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_swap_incumbent ON swap_validations(incumbent_material_id);
CREATE INDEX IF NOT EXISTS idx_swap_sustainable ON swap_validations(sustainable_material_id);
CREATE INDEX IF NOT EXISTS idx_swap_status ON swap_validations(validation_status);
CREATE INDEX IF NOT EXISTS idx_swap_rfq ON swap_validations(rfq_id);

-- Material Assembly Specs
CREATE TABLE IF NOT EXISTS material_assembly_specs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  total_thickness_inches DECIMAL(5,2),
  total_r_value DECIMAL(5,2),
  fire_rating VARCHAR(50),
  ul_design_number VARCHAR(50),
  stc_rating INTEGER,
  iic_rating INTEGER,
  total_cost_per_sf DECIMAL(10,2),
  total_gwp_per_sf DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assembly_specs_category ON material_assembly_specs(category);
CREATE INDEX IF NOT EXISTS idx_assembly_specs_ul ON material_assembly_specs(ul_design_number);

-- Assembly Spec Components
CREATE TABLE IF NOT EXISTS assembly_spec_components (
  id SERIAL PRIMARY KEY,
  assembly_spec_id INTEGER NOT NULL REFERENCES material_assembly_specs(id),
  material_id INTEGER NOT NULL,
  layer_order INTEGER NOT NULL,
  layer_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(8,2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  thickness_inches DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assembly_comp_assembly ON assembly_spec_components(assembly_spec_id);
CREATE INDEX IF NOT EXISTS idx_assembly_comp_material ON assembly_spec_components(material_id);

-- Pricing Data
CREATE TABLE IF NOT EXISTS pricing_data (
  id SERIAL PRIMARY KEY,
  material_id INTEGER NOT NULL,
  price_per_unit DECIMAL(12,4),
  unit VARCHAR(50),
  currency VARCHAR(10) DEFAULT 'USD',
  state VARCHAR(2),
  city VARCHAR(100),
  zip_code VARCHAR(10),
  county VARCHAR(100),
  source VARCHAR(100),
  source_date TIMESTAMP,
  source_url TEXT,
  project_name VARCHAR(255),
  contract_number VARCHAR(100),
  labor_rate_per_hour DECIMAL(10,2),
  total_labor_cost DECIMAL(12,2),
  data_confidence DECIMAL(3,2),
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pricing_material ON pricing_data(material_id);
CREATE INDEX IF NOT EXISTS idx_pricing_state ON pricing_data(state);
