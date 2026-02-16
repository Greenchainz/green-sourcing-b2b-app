import { mysqlTable, serial, varchar, text, decimal, int, timestamp, json, index, float } from "drizzle-orm/mysql-core";

/**
 * Suppliers table with geolocation support
 * Stores supplier information with coordinates for distance-based queries
 */
export const suppliersLocation = mysqlTable(
  "suppliers_location",
  {
    id: serial("id").primaryKey(),
    supplierId: int("supplier_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    state: varchar("state", { length: 2 }).notNull(), // "CA", "NY", "TX"
    city: varchar("city", { length: 100 }).notNull(),
    zipCode: varchar("zip_code", { length: 10 }).notNull(),
    latitude: float("latitude").notNull(),
    longitude: float("longitude").notNull(),
    
    // Material availability
    materialsAvailable: json("materials_available").$type<string[]>().default([]), // ["concrete", "steel", "insulation"]
    
    // Supplier metrics
    carbonScore: decimal("carbon_score", { precision: 5, scale: 2 }).default("0"), // 0-100
    pricePerUnit: decimal("price_per_unit", { precision: 10, scale: 2 }),
    leadTimeDays: int("lead_time_days").default(7),
    
    // Contact
    contactEmail: varchar("contact_email", { length: 255 }),
    contactPhone: varchar("contact_phone", { length: 20 }),
    
    // Metadata
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    stateIndex: index("idx_suppliers_location_state").on(table.state),
    cityIndex: index("idx_suppliers_location_city").on(table.city),
    latLngIndex: index("idx_suppliers_location_latlng").on(table.latitude, table.longitude),
  })
);

/**
 * Compliance rules table
 * Stores state-specific building codes and compliance requirements
 */
export const complianceRules = mysqlTable(
  "compliance_rules",
  {
    id: serial("id").primaryKey(),
    state: varchar("state", { length: 2 }).notNull(), // "CA", "NY", "TX"
    buildingCode: varchar("building_code", { length: 100 }).notNull(), // "IBC 2024", "NYC Local Law 97"
    ruleName: varchar("rule_name", { length: 255 }).notNull(),
    ruleDescription: text("rule_description"),
    
    // What materials this applies to
    appliesToMaterials: json("applies_to_materials").$type<string[]>().default([]), // ["concrete", "steel"]
    
    // Compliance details
    complianceType: varchar("compliance_type", { length: 50 }), // "voc_limit", "fire_rating", "carbon_limit"
    complianceValue: varchar("compliance_value", { length: 100 }), // "50 g/L", "1-hour", "500 kg CO2e"
    
    // Metadata
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    stateIndex: index("idx_compliance_rules_state").on(table.state),
    buildingCodeIndex: index("idx_compliance_rules_code").on(table.buildingCode),
  })
);

/**
 * Regional swap patterns table
 * Tracks which material swaps are approved/used in each region
 */
export const regionalSwapPatterns = mysqlTable(
  "regional_swap_patterns",
  {
    id: serial("id").primaryKey(),
    state: varchar("state", { length: 2 }).notNull(), // "CA", "NY", "TX"
    originalMaterial: varchar("original_material", { length: 255 }).notNull(),
    alternativeMaterial: varchar("alternative_material", { length: 255 }).notNull(),
    
    // Approval metrics
    approvalRate: decimal("approval_rate", { precision: 5, scale: 2 }).default("0"), // 0-100 %
    usageCount: int("usage_count").default(0), // How many times this swap was used
    
    // Performance metrics
    avgCarbonReduction: decimal("avg_carbon_reduction", { precision: 5, scale: 2 }).default("0"), // %
    avgCostDelta: decimal("avg_cost_delta", { precision: 10, scale: 2 }).default("0"), // $ difference
    avgPaybackYears: decimal("avg_payback_years", { precision: 5, scale: 2 }).default("0"),
    
    // Metadata
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    stateIndex: index("idx_swap_patterns_state").on(table.state),
    materialIndex: index("idx_swap_patterns_material").on(table.originalMaterial),
  })
);

/**
 * Shipping cost matrix table
 * Stores shipping costs between regions for different material types
 */
export const shippingCosts = mysqlTable(
  "shipping_costs",
  {
    id: serial("id").primaryKey(),
    originState: varchar("origin_state", { length: 2 }).notNull(),
    destinationState: varchar("destination_state", { length: 2 }).notNull(),
    materialType: varchar("material_type", { length: 100 }).notNull(), // "concrete", "steel", "insulation"
    
    // Cost and time
    costPerUnit: decimal("cost_per_unit", { precision: 10, scale: 2 }).notNull(),
    daysToDelivery: int("days_to_delivery").notNull(),
    
    // Metadata
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    routeIndex: index("idx_shipping_route").on(table.originState, table.destinationState),
    materialIndex: index("idx_shipping_material").on(table.materialType),
  })
);

/**
 * Climate zone adjustments table
 * Stores material performance adjustments based on climate zone
 */
export const climateZoneAdjustments = mysqlTable(
  "climate_zone_adjustments",
  {
    id: serial("id").primaryKey(),
    climateZone: varchar("climate_zone", { length: 10 }).notNull(), // "6B", "2A", "4A"
    materialType: varchar("material_type", { length: 100 }).notNull(),
    
    // Performance multipliers
    durabilityMultiplier: decimal("durability_multiplier", { precision: 3, scale: 2 }).default("1.0"),
    rValueMultiplier: decimal("r_value_multiplier", { precision: 3, scale: 2 }).default("1.0"),
    carbonImpactMultiplier: decimal("carbon_impact_multiplier", { precision: 3, scale: 2 }).default("1.0"),
    
    // Notes
    notes: text("notes"),
    
    // Metadata
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    zoneIndex: index("idx_climate_zone").on(table.climateZone),
    materialIndex: index("idx_climate_material").on(table.materialType),
  })
);

/**
 * Location-based pricing adjustments table
 * Stores regional pricing variations for materials
 */
export const locationPricingAdjustments = mysqlTable(
  "location_pricing_adjustments",
  {
    id: serial("id").primaryKey(),
    state: varchar("state", { length: 2 }).notNull(),
    materialType: varchar("material_type", { length: 100 }).notNull(),
    
    // Price adjustment
    priceMultiplier: decimal("price_multiplier", { precision: 3, scale: 2 }).default("1.0"), // 1.0 = base price
    
    // Metadata
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    stateIndex: index("idx_pricing_state").on(table.state),
    materialIndex: index("idx_pricing_material").on(table.materialType),
  })
);
