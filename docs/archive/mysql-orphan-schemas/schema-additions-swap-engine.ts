/**
 * Schema Additions for Swap Engine: Functional Equivalence Validation
 * 
 * These tables extend the existing schema to support:
 * - Showstopper metrics (ASTM, UL, ICC-ES, structural, thermal, acoustic)
 * - Regional pricing data (DOT bid tabs, Craftsman, RSMeans, Home Depot)
 * - Swap validation tracking with CSI Form 13.1A generation
 * 
 * To integrate: Copy these table definitions into drizzle/schema.ts
 */

import {
  int,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
  index,
  mysqlEnum,
} from "drizzle-orm/mysql-core";

// ─── Material Technical Specifications ─────────────────────────────────────

/**
 * Extends materials table with detailed technical showstopper metrics
 * These are the "hard" metrics that determine functional equivalence
 */
export const materialTechnicalSpecs = mysqlTable(
  "material_technical_specs",
  {
    id: int("id").autoincrement().primaryKey(),
    materialId: int("material_id").notNull(), // Foreign key to materials table
    
    // ─── ASTM Standards ───────────────────────────────────────────────────
    // JSON array of ASTM codes: ["ASTM C150", "ASTM C39", "ASTM E119"]
    astmCodes: json("astm_codes").$type<string[]>().default([]),
    
    // ─── Fire & Safety Certifications ─────────────────────────────────────
    // UL Product iQ listing number
    ulListing: varchar("ul_listing", { length: 255 }),
    // UL Design number (e.g., "U419" for wall assemblies)
    ulDesignNumber: varchar("ul_design_number", { length: 50 }),
    // ICC-ES Evaluation Report number (e.g., "ESR-1234")
    iccEsReport: varchar("icc_es_report", { length: 50 }),
    // Fire rating (e.g., "1-Hour", "2-Hour", "Class A")
    fireRating: varchar("fire_rating", { length: 50 }),
    // Fire rating standard (e.g., "ASTM E119", "UL 263")
    fireRatingStandard: varchar("fire_rating_standard", { length: 100 }),
    // Char rate for mass timber (e.g., "1.5 in/hr")
    charRate: varchar("char_rate", { length: 50 }),
    
    // ─── Structural Performance ───────────────────────────────────────────
    // Compressive strength in psi (e.g., 4000)
    compressiveStrengthPsi: int("compressive_strength_psi"),
    // Modulus of elasticity in ksi (e.g., 29000 for steel, 1500 for timber)
    modulusOfElasticityKsi: int("modulus_of_elasticity_ksi"),
    // Flexural strength in psi
    flexuralStrengthPsi: int("flexural_strength_psi"),
    // Tensile strength in psi
    tensileStrengthPsi: int("tensile_strength_psi"),
    // Stiffness (for deflection calculations)
    stiffnessKsi: int("stiffness_ksi"),
    
    // ─── Thermal Performance ──────────────────────────────────────────────
    // R-value per inch (e.g., 6.5 for polyiso)
    rValuePerInch: decimal("r_value_per_inch", { precision: 5, scale: 2 }),
    // Long-term thermal resistance (15-year weighted average)
    lttr15Year: decimal("lttr_15_year", { precision: 5, scale: 2 }),
    // Vapor permeability (perm rating)
    permRating: decimal("perm_rating", { precision: 5, scale: 2 }),
    // Thermal U-value
    thermalUValue: decimal("thermal_u_value", { precision: 8, scale: 4 }),
    
    // ─── Acoustic Performance ─────────────────────────────────────────────
    // Sound Transmission Class (e.g., 50 for healthcare demising walls)
    stcRating: int("stc_rating"),
    // Impact Insulation Class (for floor assemblies)
    iicRating: int("iic_rating"),
    // Noise Reduction Coefficient
    nrcRating: decimal("nrc_rating", { precision: 3, scale: 2 }),
    
    // ─── Installability & Labor ──────────────────────────────────────────
    // Labor units (man-hours per unit from NECA/RSMeans)
    laborUnits: decimal("labor_units", { precision: 5, scale: 2 }),
    // Cure time in hours (for concrete, adhesives)
    cureTimeHours: int("cure_time_hours"),
    // Weight per unit in lbs
    weightPerUnit: decimal("weight_per_unit", { precision: 8, scale: 2 }),
    // Slump/workability rating (for concrete)
    slumpWorkability: varchar("slump_workability", { length: 50 }),
    // Installation difficulty rating (1-5, 5=hardest)
    installationDifficulty: int("installation_difficulty"),
    
    // ─── Reliability & Supply Chain ──────────────────────────────────────
    // Lead time in days
    leadTimeDays: int("lead_time_days"),
    // On-Time In-Full percentage (0-100)
    otifPercentage: decimal("otif_percentage", { precision: 5, scale: 2 }),
    // Supplier financial health (Z-score)
    supplierZScore: decimal("supplier_z_score", { precision: 5, scale: 2 }),
    
    // ─── Lifecycle & Maintenance ──────────────────────────────────────────
    // Warranty years
    warrantyYears: int("warranty_years"),
    // Maintenance cycle in years
    maintenanceCycleYears: int("maintenance_cycle_years"),
    // Expected lifespan in years
    expectedLifespanYears: int("expected_lifespan_years"),
    
    // ─── Metadata ─────────────────────────────────────────────────────────
    // Data source (e.g., "UL_PRODUCT_IQ", "MANUFACTURER_DATASHEET", "MANUAL_ENTRY")
    dataSource: varchar("data_source", { length: 100 }),
    // Data quality confidence (0-100)
    dataConfidence: int("data_confidence").default(50),
    // Last verified date
    lastVerifiedAt: timestamp("last_verified_at"),
    // Verified by (user ID)
    verifiedBy: int("verified_by"),
    
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    materialIdx: index("idx_tech_specs_material").on(table.materialId),
    ulListingIdx: index("idx_tech_specs_ul").on(table.ulListing),
    iccEsIdx: index("idx_tech_specs_icc_es").on(table.iccEsReport),
  })
);

export type MaterialTechnicalSpec = typeof materialTechnicalSpecs.$inferSelect;
export type InsertMaterialTechnicalSpec = typeof materialTechnicalSpecs.$inferInsert;

// ─── Regional Pricing Data ──────────────────────────────────────────────────

/**
 * Stores regional pricing from multiple sources:
 * - State DOT bid tabs (TXDOT, WSDOT, Caltrans)
 * - Craftsman National Construction Estimator
 * - RSMeans API
 * - Home Depot local pricing
 */
export const pricingData = mysqlTable(
  "pricing_data",
  {
    id: int("id").autoincrement().primaryKey(),
    materialId: int("material_id").notNull(), // Foreign key to materials table
    
    // ─── Pricing ──────────────────────────────────────────────────────────
    // Price per unit (e.g., $140.00)
    pricePerUnit: decimal("price_per_unit", { precision: 10, scale: 2 }).notNull(),
    // Unit (e.g., "CY", "SF", "LF", "EA", "TON")
    unit: varchar("unit", { length: 50 }).notNull(),
    // Currency (default USD)
    currency: varchar("currency", { length: 3 }).default("USD"),
    
    // ─── Regional Context ─────────────────────────────────────────────────
    // State (e.g., "TX", "CA", "NY")
    state: varchar("state", { length: 2 }),
    // City (e.g., "Austin", "Los Angeles")
    city: varchar("city", { length: 100 }),
    // ZIP code
    zipCode: varchar("zip_code", { length: 10 }),
    // County (for rural areas)
    county: varchar("county", { length: 100 }),
    
    // ─── Data Source ──────────────────────────────────────────────────────
    // Source type: "TXDOT_BID_TAB", "CRAFTSMAN", "RSMEANS", "HOME_DEPOT", "MANUAL_ENTRY"
    source: varchar("source", { length: 50 }).notNull(),
    // Date of pricing data
    sourceDate: timestamp("source_date"),
    // Source URL or reference
    sourceUrl: text("source_url"),
    // Project name (for DOT bid tabs)
    projectName: varchar("project_name", { length: 255 }),
    // Contract number (for DOT bid tabs)
    contractNumber: varchar("contract_number", { length: 100 }),
    
    // ─── Labor Pricing ────────────────────────────────────────────────────
    // Labor rate per hour (regional)
    laborRatePerHour: decimal("labor_rate_per_hour", { precision: 8, scale: 2 }),
    // Total labor cost (material cost + labor cost)
    totalLaborCost: decimal("total_labor_cost", { precision: 10, scale: 2 }),
    
    // ─── Metadata ─────────────────────────────────────────────────────────
    // Data quality confidence (0-100)
    dataConfidence: int("data_confidence").default(50),
    // Is this price still current? (expires after 6 months)
    isActive: boolean("is_active").default(true),
    // Expiration date
    expiresAt: timestamp("expires_at"),
    
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    materialIdx: index("idx_pricing_material").on(table.materialId),
    stateIdx: index("idx_pricing_state").on(table.state),
    sourceIdx: index("idx_pricing_source").on(table.source),
    activeIdx: index("idx_pricing_active").on(table.isActive),
  })
);

export type PricingData = typeof pricingData.$inferSelect;
export type InsertPricingData = typeof pricingData.$inferInsert;

// ─── Swap Validations ───────────────────────────────────────────────────────

/**
 * Tracks validation results for material swaps
 * Stores showstopper checks, cost/carbon comparison, and CSI form URLs
 */
export const swapValidations = mysqlTable(
  "swap_validations",
  {
    id: int("id").autoincrement().primaryKey(),
    
    // ─── Materials ────────────────────────────────────────────────────────
    // Incumbent (baseline) material ID
    incumbentMaterialId: int("incumbent_material_id").notNull(),
    // Sustainable (proposed) material ID
    sustainableMaterialId: int("sustainable_material_id").notNull(),
    
    // ─── Validation Results ───────────────────────────────────────────────
    // Is this a valid swap? (all showstoppers passed)
    isValidSwap: boolean("is_valid_swap").notNull(),
    // Validation status: "APPROVED", "EXPERIMENTAL", "REJECTED"
    validationStatus: mysqlEnum("validation_status", ["APPROVED", "EXPERIMENTAL", "REJECTED"]).notNull(),
    
    // ─── Showstopper Checks ───────────────────────────────────────────────
    // ASTM codes match?
    astmMatch: boolean("astm_match").notNull(),
    // Fire rating matches or exceeds?
    fireRatingMatch: boolean("fire_rating_match").notNull(),
    // UL listing exists?
    ulListingMatch: boolean("ul_listing_match").notNull(),
    // Structural strength adequate?
    strengthAdequate: boolean("strength_adequate").notNull(),
    // R-value adequate?
    rValueAdequate: boolean("r_value_adequate").notNull(),
    // STC rating adequate?
    stcAdequate: boolean("stc_adequate").notNull(),
    
    // ─── Warnings ─────────────────────────────────────────────────────────
    // JSON array of warnings: ["Labor units 20% higher", "Cure time 2x longer"]
    warnings: json("warnings").$type<string[]>().default([]),
    
    // ─── Cost Comparison ──────────────────────────────────────────────────
    // Incumbent total cost (material + labor)
    incumbentTotalCost: decimal("incumbent_total_cost", { precision: 10, scale: 2 }),
    // Sustainable total cost (material + labor)
    sustainableTotalCost: decimal("sustainable_total_cost", { precision: 10, scale: 2 }),
    // Cost delta percentage (positive = more expensive, negative = cheaper)
    costDeltaPercentage: decimal("cost_delta_percentage", { precision: 5, scale: 2 }),
    
    // ─── Carbon Comparison ────────────────────────────────────────────────
    // Incumbent GWP (kg CO2e)
    incumbentGwp: decimal("incumbent_gwp", { precision: 10, scale: 2 }),
    // Sustainable GWP (kg CO2e)
    sustainableGwp: decimal("sustainable_gwp", { precision: 10, scale: 2 }),
    // Carbon reduction percentage
    carbonReductionPercentage: decimal("carbon_reduction_percentage", { precision: 5, scale: 2 }),
    
    // ─── Project Context ──────────────────────────────────────────────────
    // Project location (state)
    projectState: varchar("project_state", { length: 2 }),
    // Project location (city)
    projectCity: varchar("project_city", { length: 100 }),
    // Project type (e.g., "Commercial Office", "Residential")
    projectType: varchar("project_type", { length: 100 }),
    
    // ─── Generated Documentation ──────────────────────────────────────────
    // S3 URL to generated CSI Form 13.1A
    csiFormUrl: text("csi_form_url"),
    // Generated at timestamp
    csiFormGeneratedAt: timestamp("csi_form_generated_at"),
    
    // ─── User Tracking ────────────────────────────────────────────────────
    // User who requested validation
    requestedBy: int("requested_by"),
    // RFQ ID (if validation is part of RFQ workflow)
    rfqId: int("rfq_id"),
    
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    incumbentIdx: index("idx_swap_incumbent").on(table.incumbentMaterialId),
    sustainableIdx: index("idx_swap_sustainable").on(table.sustainableMaterialId),
    statusIdx: index("idx_swap_status").on(table.validationStatus),
    rfqIdx: index("idx_swap_rfq").on(table.rfqId),
  })
);

export type SwapValidation = typeof swapValidations.$inferSelect;
export type InsertSwapValidation = typeof swapValidations.$inferInsert;

// ─── Material Assembly Specifications ───────────────────────────────────────

/**
 * Assembly-level specifications (separate from existing assemblies table)
 * Tracks complete wall/roof/floor systems with UL design numbers
 */
export const materialAssemblySpecs = mysqlTable(
  "material_assembly_specs",
  {
    id: int("id").autoincrement().primaryKey(),
    
    // ─── Assembly Identity ───────────────────────────────────────────────
    // Assembly name (e.g., "2-Hour Fire-Rated CMU Wall")
    name: varchar("name", { length: 255 }).notNull(),
    // Assembly category (e.g., "Interior Walls", "Roof Systems", "Floor Systems")
    category: varchar("category", { length: 100 }).notNull(),
    // Description
    description: text("description"),
    
    // ─── Assembly-Level Specs ─────────────────────────────────────────────
    // Total thickness in inches
    totalThicknessInches: decimal("total_thickness_inches", { precision: 5, scale: 2 }),
    // Total R-value
    totalRValue: decimal("total_r_value", { precision: 5, scale: 2 }),
    // Fire rating (e.g., "2-Hour")
    fireRating: varchar("fire_rating", { length: 50 }),
    // UL Design number (e.g., "U419")
    ulDesignNumber: varchar("ul_design_number", { length: 50 }),
    // STC rating (for walls)
    stcRating: int("stc_rating"),
    // IIC rating (for floors)
    iicRating: int("iic_rating"),
    
    // ─── Cost & Carbon ────────────────────────────────────────────────────
    // Total cost per SF
    totalCostPerSf: decimal("total_cost_per_sf", { precision: 10, scale: 2 }),
    // Total GWP per SF
    totalGwpPerSf: decimal("total_gwp_per_sf", { precision: 10, scale: 2 }),
    
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    categoryIdx: index("idx_assembly_specs_category").on(table.category),
    ulDesignIdx: index("idx_assembly_specs_ul").on(table.ulDesignNumber),
  })
);

export type MaterialAssemblySpec = typeof materialAssemblySpecs.$inferSelect;
export type InsertMaterialAssemblySpec = typeof materialAssemblySpecs.$inferInsert;

// ─── Assembly Components (Enhanced) ─────────────────────────────────────────

/**
 * Links materials to assembly specs with layer order and quantities
 * Note: This extends the existing assembly_components table concept
 */
export const assemblySpecComponents = mysqlTable(
  "assembly_spec_components",
  {
    id: int("id").autoincrement().primaryKey(),
    // Foreign key to material_assembly_specs table
    assemblySpecId: int("assembly_spec_id").notNull(),
    // Foreign key to materials table
    materialId: int("material_id").notNull(),
    // Layer order (1 = exterior, 2 = middle, 3 = interior)
    layerOrder: int("layer_order").notNull(),
    // Layer name (e.g., "Exterior Sheathing", "Insulation", "Interior Drywall")
    layerName: varchar("layer_name", { length: 255 }).notNull(),
    // Quantity
    quantity: decimal("quantity", { precision: 8, scale: 2 }).notNull(),
    // Unit (e.g., "SF", "LF", "EA")
    unit: varchar("unit", { length: 50 }).notNull(),
    // Thickness in inches (for this layer)
    thicknessInches: decimal("thickness_inches", { precision: 5, scale: 2 }),
    
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    assemblyIdx: index("idx_assembly_comp_assembly").on(table.assemblySpecId),
    materialIdx: index("idx_assembly_comp_material").on(table.materialId),
  })
);

export type AssemblySpecComponent = typeof assemblySpecComponents.$inferSelect;
export type InsertAssemblySpecComponent = typeof assemblySpecComponents.$inferInsert;
