# GreenChainz CCPS Database Schema Design

## Overview

This document defines the database schema required to support the Composite Compliance-Performance Score (CCPS) algorithm and materials catalog for GreenChainz. The schema is designed to store materials, assemblies, certifications, decision-maker personas, and CCPS metric calculations.

---

## Core Tables

### **1. Materials Table**

Stores individual material products with base information.

```sql
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL, -- e.g., "Insulation", "Flooring", "Concrete", "Drywall"
  manufacturer_id UUID REFERENCES manufacturers(id),
  product_name VARCHAR(255),
  description TEXT,
  
  -- EPD & Environmental Data
  epd_number VARCHAR(100) UNIQUE,
  epd_url TEXT,
  epd_valid_until DATE,
  global_warming_potential DECIMAL(10, 2), -- kg CO2e per declared unit
  declared_unit VARCHAR(100), -- e.g., "1 m²", "1 kg", "1 unit"
  
  -- Compliance & Standards
  fire_rating VARCHAR(50), -- e.g., "A1", "B-s1,d0", "Class A"
  fire_rating_standard VARCHAR(100), -- e.g., "EN 13823", "ASTM E84"
  thermal_r_value DECIMAL(8, 2), -- R-value for insulation
  thermal_u_value DECIMAL(8, 4), -- U-value for windows/doors
  voc_level VARCHAR(50), -- e.g., "Low-VOC", "No-VOC", "High-VOC"
  voc_certification VARCHAR(100), -- e.g., "GREENGUARD Gold", "FloorScore"
  
  -- Durability & Warranty
  expected_lifecycle_years INT, -- Expected lifespan in years
  manufacturer_warranty_years INT,
  
  -- Sourcing & Supply Chain
  lead_time_days INT, -- Typical lead time in days
  us_manufactured BOOLEAN DEFAULT false,
  regional_availability_miles INT, -- Approximate radius for availability
  
  -- Certifications (boolean flags)
  has_epd BOOLEAN DEFAULT false,
  has_hpd BOOLEAN DEFAULT false,
  has_fsc BOOLEAN DEFAULT false,
  has_c2c BOOLEAN DEFAULT false,
  has_greenguard BOOLEAN DEFAULT false,
  on_red_list BOOLEAN DEFAULT false,
  
  -- Pricing
  price_per_unit DECIMAL(10, 2),
  price_unit VARCHAR(50), -- e.g., "per m²", "per unit", "per kg"
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_source VARCHAR(100), -- e.g., "EC3", "Autodesk SDA", "Building Transparency"
  
  INDEX idx_category (category),
  INDEX idx_manufacturer (manufacturer_id),
  INDEX idx_epd_number (epd_number)
);
```

### **2. Manufacturers Table**

Stores manufacturer information and supplier details.

```sql
CREATE TABLE manufacturers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  website TEXT,
  phone VARCHAR(20),
  email VARCHAR(100),
  
  -- Supplier Reliability
  years_in_business INT,
  supplier_rating DECIMAL(3, 2), -- 0-5 star rating
  
  -- Geographic Information
  headquarters_country VARCHAR(100),
  headquarters_state VARCHAR(50),
  us_production_facilities INT DEFAULT 0,
  
  -- Certifications
  iso_certified BOOLEAN DEFAULT false,
  iso_certification_number VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_name (name)
);
```

### **3. Assemblies Table**

Stores complete building assemblies (e.g., wall systems, floor systems) that combine multiple materials.

```sql
CREATE TABLE assemblies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  assembly_type VARCHAR(100) NOT NULL, -- e.g., "Wall", "Floor", "Roof", "Window"
  location VARCHAR(100), -- e.g., "Interior", "Exterior", "Foundation"
  description TEXT,
  
  -- Assembly Composition
  component_count INT,
  total_thickness_inches DECIMAL(8, 2),
  
  -- Environmental Performance
  total_gwp_per_1000_sqft DECIMAL(10, 2), -- kg CO2e per 1000 sq ft
  total_gwp_per_sqm DECIMAL(10, 2), -- kg CO2e per m²
  
  -- Performance Metrics
  total_r_value DECIMAL(8, 2),
  fire_rating VARCHAR(50),
  sound_transmission_class INT, -- STC rating
  
  -- Sourcing
  lead_time_days INT,
  us_sourcing_percentage INT, -- 0-100%
  
  -- Metadata
  source_document VARCHAR(255), -- e.g., "EWS Combined Assemblies"
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_assembly_type (assembly_type),
  INDEX idx_location (location)
);
```

### **4. Assembly_Components Table**

Stores the individual materials that make up each assembly (junction table).

```sql
CREATE TABLE assembly_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id UUID NOT NULL REFERENCES assemblies(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id),
  
  -- Component Details
  layer_order INT NOT NULL, -- 1 = innermost, N = outermost
  layer_name VARCHAR(100), -- e.g., "Interior Finish", "Insulation", "Sheathing"
  thickness_inches DECIMAL(8, 2),
  quantity_per_sqft DECIMAL(10, 4),
  
  -- Component-Specific Performance
  r_value_contribution DECIMAL(8, 2),
  gwp_contribution_per_sqft DECIMAL(10, 4), -- kg CO2e per sq ft
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE (assembly_id, material_id, layer_order),
  INDEX idx_assembly (assembly_id),
  INDEX idx_material (material_id)
);
```

### **5. Material_Certifications Table**

Stores detailed certification information for each material.

```sql
CREATE TABLE material_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  
  certification_type VARCHAR(100) NOT NULL, -- e.g., "EPD", "HPD", "FSC", "C2C", "GREENGUARD"
  certification_name VARCHAR(255),
  certification_number VARCHAR(100),
  issuing_body VARCHAR(255), -- e.g., "Environdec", "USGBC", "Cradle to Cradle Products Innovation Institute"
  
  issue_date DATE,
  expiration_date DATE,
  certification_url TEXT,
  
  -- LEED Contribution
  leed_credit_category VARCHAR(100), -- e.g., "MR", "EQ", "SS"
  leed_credit_number VARCHAR(50), -- e.g., "MR 2.2"
  leed_points_value INT, -- Points contributed to LEED score
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_material (material_id),
  INDEX idx_certification_type (certification_type)
);
```

### **6. CCPS_Baselines Table**

Stores baseline materials for each category to enable relative scoring.

```sql
CREATE TABLE ccps_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(100) NOT NULL UNIQUE, -- e.g., "Concrete", "Insulation", "Flooring"
  
  -- Baseline Material Reference
  baseline_material_id UUID REFERENCES materials(id),
  baseline_material_name VARCHAR(255),
  
  -- Baseline Metrics
  baseline_gwp_per_unit DECIMAL(10, 2), -- kg CO2e per declared unit
  baseline_price_per_unit DECIMAL(10, 2),
  baseline_lead_time_days INT,
  
  -- Category Averages
  category_avg_gwp DECIMAL(10, 2),
  category_avg_price DECIMAL(10, 2),
  category_avg_lead_time INT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **7. CCPS_Scores Table**

Stores calculated CCPS scores for each material and decision-maker persona.

```sql
CREATE TABLE ccps_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  
  -- Decision-Maker Persona
  decision_maker_persona VARCHAR(100), -- e.g., "Architect", "LEED_AP", "General_Contractor", "Facility_Manager"
  
  -- Individual Metric Scores (0-100)
  carbon_score INT,
  compliance_score INT,
  certification_score INT,
  cost_score INT,
  supply_chain_score INT,
  health_score INT,
  
  -- Weighted CCPS (0-100)
  ccps_score INT,
  
  -- Metric Breakdown (for transparency)
  carbon_weight DECIMAL(5, 2), -- 25% for default
  compliance_weight DECIMAL(5, 2), -- 20% for default
  certification_weight DECIMAL(5, 2), -- 20% for default
  cost_weight DECIMAL(5, 2), -- 15% for default
  supply_chain_weight DECIMAL(5, 2), -- 12% for default
  health_weight DECIMAL(5, 2), -- 8% for default
  
  -- Sourcing Difficulty (1-5 scale)
  sourcing_difficulty INT,
  
  -- Metadata
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  valid_until TIMESTAMP,
  
  UNIQUE (material_id, decision_maker_persona),
  INDEX idx_material (material_id),
  INDEX idx_persona (decision_maker_persona),
  INDEX idx_ccps_score (ccps_score DESC)
);
```

### **8. Decision_Maker_Personas Table**

Stores decision-maker persona definitions and their CCPS weighting preferences.

```sql
CREATE TABLE decision_maker_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_name VARCHAR(100) NOT NULL UNIQUE, -- e.g., "Architect", "LEED_AP", "General_Contractor"
  persona_description TEXT,
  
  -- CCPS Metric Weights (must sum to 100)
  carbon_weight DECIMAL(5, 2) DEFAULT 25.0,
  compliance_weight DECIMAL(5, 2) DEFAULT 20.0,
  certification_weight DECIMAL(5, 2) DEFAULT 20.0,
  cost_weight DECIMAL(5, 2) DEFAULT 15.0,
  supply_chain_weight DECIMAL(5, 2) DEFAULT 12.0,
  health_weight DECIMAL(5, 2) DEFAULT 8.0,
  
  -- Decision Logic
  primary_driver VARCHAR(255), -- e.g., "Liability & Code Compliance"
  key_concerns TEXT, -- e.g., "Fire safety, warranty, professional liability"
  
  -- Targeting Information
  typical_job_titles TEXT, -- e.g., "Architect, Project Architect, Design Principal"
  industry_associations TEXT, -- e.g., "AIA, NCARB"
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **9. Material_Suppliers Table**

Stores supplier/distributor information for each material (many-to-many).

```sql
CREATE TABLE material_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES manufacturers(id),
  
  -- Supplier-Specific Information
  supplier_sku VARCHAR(100),
  supplier_price DECIMAL(10, 2),
  supplier_lead_time_days INT,
  
  -- Inventory Status
  in_stock BOOLEAN DEFAULT false,
  stock_quantity INT,
  
  -- Regional Information
  supplier_region VARCHAR(100), -- e.g., "Northeast", "West Coast"
  supplier_state VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE (material_id, supplier_id),
  INDEX idx_material (material_id),
  INDEX idx_supplier (supplier_id)
);
```

### **10. Material_Search_History Table**

Tracks user searches for analytics and personalization.

```sql
CREATE TABLE material_search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  
  search_query VARCHAR(255),
  search_category VARCHAR(100),
  decision_maker_persona VARCHAR(100),
  
  -- Results Clicked
  material_id_clicked UUID REFERENCES materials(id),
  assembly_id_clicked UUID REFERENCES assemblies(id),
  
  -- Engagement
  time_on_results_seconds INT,
  material_cards_viewed INT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user (user_id),
  INDEX idx_created (created_at)
);
```

---

## CCPS Calculation Logic

### **Metric Calculation Formulas**

**1. Carbon Score (0-100)**
```
carbon_score = ((baseline_gwp - product_gwp) / baseline_gwp) * 100
Capped at 0-100 range
```

**2. Compliance Score (0-100)**
```
compliance_score = (
  (epd_validity_points / 30) * 30 +
  (code_compliance_points / 25) * 25 +
  (warranty_points / 20) * 20 +
  (durability_points / 25) * 25
) / 100
```

**3. Certification Score (0-100)**
```
certification_score = (
  (epd_present ? 25 : 0) +
  (hpd_present ? 25 : 0) +
  (fsc_or_c2c ? 20 : 0) +
  (greenguard ? 20 : 0) +
  (leed_credit ? 10 : 0)
) / 100
```

**4. Cost Score (0-100)**
```
cost_score = ((category_avg_price - product_price) / category_avg_price) * 100
Can be negative for premium products
```

**5. Supply Chain Score (0-100)**
```
supply_chain_score = (
  (lead_time_points / 30) * 30 +
  (regional_availability_points / 30) * 30 +
  (us_production_points / 20) * 20 +
  (supplier_reliability_points / 20) * 20
) / 100
```

**6. Health Score (0-100)**
```
health_score = (
  (voc_certification ? 25 : 0) +
  (not_on_red_list ? 25 : 0) +
  (ingredient_disclosure ? 25 : 0) +
  (biophilic_properties ? 25 : 0)
) / 100
```

**7. Final CCPS (Persona-Weighted)**
```
ccps_score = (
  (carbon_score * carbon_weight) +
  (compliance_score * compliance_weight) +
  (certification_score * certification_weight) +
  (cost_score * cost_weight) +
  (supply_chain_score * supply_chain_weight) +
  (health_score * health_weight)
) / 100
```

---

## Sourcing Difficulty Calculation

```
sourcing_difficulty = (
  (lead_time_days / 30) * 2 +
  (regional_availability_miles < 500 ? 0 : 2) +
  (us_manufactured ? -1 : 1) +
  (supplier_years_in_business < 5 ? 1 : 0)
) / 5

Capped at 1-5 scale:
1 = Easy to source
5 = Difficult to source
```

---

## Data Relationships Diagram

```
manufacturers (1) ──→ (N) materials
                 ──→ (N) material_suppliers

materials (1) ──→ (N) assembly_components
          ──→ (N) material_certifications
          ──→ (N) ccps_scores
          ──→ (N) material_suppliers
          ──→ (N) material_search_history

assemblies (1) ──→ (N) assembly_components
            ──→ (N) material_search_history

decision_maker_personas (1) ──→ (N) ccps_scores

ccps_baselines (1) ──→ (1) materials (baseline_material_id)

users (1) ──→ (N) material_search_history
```

---

## Indexing Strategy

**High-Priority Indexes (for frequent queries):**
- `materials(category)` - Filter by material type
- `materials(manufacturer_id)` - Filter by manufacturer
- `ccps_scores(material_id, decision_maker_persona)` - Look up CCPS for specific persona
- `ccps_scores(ccps_score DESC)` - Sort by CCPS ranking
- `assemblies(assembly_type)` - Filter by assembly type
- `material_search_history(user_id, created_at)` - User search analytics

**Medium-Priority Indexes:**
- `materials(epd_number)` - Unique EPD lookup
- `material_certifications(certification_type)` - Filter by certification
- `material_suppliers(supplier_region)` - Regional supplier search
- `decision_maker_personas(persona_name)` - Persona lookup

---

## Migration Path

**Phase 1 (Week 1):** Create core tables (materials, manufacturers, assemblies, assembly_components)
**Phase 2 (Week 2):** Add certification and CCPS tables
**Phase 3 (Week 3):** Populate baselines and decision-maker personas
**Phase 4 (Week 4):** Calculate initial CCPS scores for all materials

---

## Data Validation Rules

1. **CCPS Scores:** All metric scores must be 0-100
2. **Weights:** Decision-maker persona weights must sum to 100
3. **Baselines:** Must exist for each material category before CCPS calculation
4. **Certifications:** Expiration dates must be in the future
5. **Suppliers:** At least one supplier required per material
6. **EPD Data:** Global Warming Potential must be positive

---

## Performance Considerations

- **Materialized Views:** Pre-calculate top 100 materials by CCPS for each persona (refresh hourly)
- **Caching:** Cache CCPS scores for 24 hours (recalculate on material update)
- **Partitioning:** Partition `material_search_history` by month for analytics queries
- **Query Optimization:** Use prepared statements for CCPS calculations to avoid repeated parsing
