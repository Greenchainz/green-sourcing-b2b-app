import { pgTable, serial, varchar, text, decimal, integer, timestamp, jsonb, index, real } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Suppliers table with geolocation support
 * Stores supplier information with coordinates for distance-based queries
 */
export const suppliersLocation = pgTable(
  "suppliers_location",
  {
    id: serial("id").primaryKey(),
    supplierId: integer("supplier_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    state: varchar("state", { length: 2 }).notNull(), // "CA", "NY", "TX"
    city: varchar("city", { length: 100 }).notNull(),
    zipCode: varchar("zip_code", { length: 10 }).notNull(),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    
    // Material availability
    materialsAvailable: jsonb("materials_available").default([]), // ["concrete", "steel", "insulation"]
    
    // Supplier metrics
    carbonScore: decimal("carbon_score", { precision: 5, scale: 2 }).default("0"), // 0-100
    pricePerUnit: decimal("price_per_unit", { precision: 10, scale: 2 }),
    leadTimeDays: integer("lead_time_days").default(7),
    
    // Contact
    contactEmail: varchar("contact_email", { length: 255 }),
    contactPhone: varchar("contact_phone", { length: 20 }),
    
    // Metadata
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    // Spatial index for distance queries (requires PostGIS)
    locationIndex: index("idx_suppliers_location_geo").on(
      sql`ST_GeomFromText('POINT(' || longitude || ' ' || latitude || ')')`
    ),
    stateIndex: index("idx_suppliers_location_state").on(table.state),
    cityIndex: index("idx_suppliers_location_city").on(table.city),
  })
);

/**
 * Compliance rules table
 * Stores state-specific building codes and compliance requirements
 */
export const complianceRules = pgTable(
  "compliance_rules",
  {
    id: serial("id").primaryKey(),
    state: varchar("state", { length: 2 }).notNull(), // "CA", "NY", "TX"
    buildingCode: varchar("building_code", { length: 100 }).notNull(), // "IBC 2024", "NYC Local Law 97"
    ruleName: varchar("rule_name", { length: 255 }).notNull(),
    ruleDescription: text("rule_description"),
    
    // What materials this applies to
    appliesToMaterials: jsonb("applies_to_materials").default([]), // ["concrete", "steel"]
    
    // Compliance details
    complianceType: varchar("compliance_type", { length: 50 }), // "voc_limit", "fire_rating", "carbon_limit"
    complianceValue: varchar("compliance_value", { length: 100 }), // "50 g/L", "1-hour", "500 kg CO2e"
    
    // Metadata
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
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
export const regionalSwapPatterns = pgTable(
  "regional_swap_patterns",
  {
    id: serial("id").primaryKey(),
    state: varchar("state", { length: 2 }).notNull(), // "CA", "NY", "TX"
    originalMaterial: varchar("original_material", { length: 255 }).notNull(),
    alternativeMaterial: varchar("alternative_material", { length: 255 }).notNull(),
    
    // Approval metrics
    approvalRate: decimal("approval_rate", { precision: 5, scale: 2 }).default("0"), // 0-100 %
    usageCount: integer("usage_count").default(0), // How many times this swap was used
    
    // Performance metrics
    avgCarbonReduction: decimal("avg_carbon_reduction", { precision: 5, scale: 2 }).default("0"), // %
    avgCostDelta: decimal("avg_cost_delta", { precision: 10, scale: 2 }).default("0"), // $ difference
    avgPaybackYears: decimal("avg_payback_years", { precision: 5, scale: 2 }).default("0"),
    
    // Metadata
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
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
export const shippingCosts = pgTable(
  "shipping_costs",
  {
    id: serial("id").primaryKey(),
    originState: varchar("origin_state", { length: 2 }).notNull(),
    destinationState: varchar("destination_state", { length: 2 }).notNull(),
    materialType: varchar("material_type", { length: 100 }).notNull(), // "concrete", "steel", "insulation"
    
    // Cost and time
    costPerUnit: decimal("cost_per_unit", { precision: 10, scale: 2 }).notNull(),
    daysToDelivery: integer("days_to_delivery").notNull(),
    
    // Metadata
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
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
export const climateZoneAdjustments = pgTable(
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
    updatedAt: timestamp("updated_at").defaultNow(),
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
export const locationPricingAdjustments = pgTable(
  "location_pricing_adjustments",
  {
    id: serial("id").primaryKey(),
    state: varchar("state", { length: 2 }).notNull(),
    materialType: varchar("material_type", { length: 100 }).notNull(),
    
    // Price adjustment
    priceMultiplier: decimal("price_multiplier", { precision: 3, scale: 2 }).default("1.0"), // 1.0 = base price
    
    // Metadata
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    stateIndex: index("idx_pricing_state").on(table.state),
    materialIndex: index("idx_pricing_material").on(table.materialType),
  })
);
