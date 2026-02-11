import { pgTable, text, varchar, decimal, integer, boolean, timestamp, uuid, index, unique, primaryKey } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Manufacturers Table
export const manufacturers = pgTable('manufacturers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  website: text('website'),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 100 }),
  yearsInBusiness: integer('years_in_business'),
  supplierRating: decimal('supplier_rating', { precision: 3, scale: 2 }),
  headquartersCountry: varchar('headquarters_country', { length: 100 }),
  headquartersState: varchar('headquarters_state', { length: 50 }),
  usProductionFacilities: integer('us_production_facilities').default(0),
  isoCertified: boolean('iso_certified').default(false),
  isoCertificationNumber: varchar('iso_certification_number', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  nameIdx: index('idx_manufacturers_name').on(table.name),
}));

// Materials Table
export const materials = pgTable('materials', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  manufacturerId: uuid('manufacturer_id').references(() => manufacturers.id),
  productName: varchar('product_name', { length: 255 }),
  description: text('description'),
  
  // EPD & Environmental Data
  epdNumber: varchar('epd_number', { length: 100 }).unique(),
  epdUrl: text('epd_url'),
  epdValidUntil: timestamp('epd_valid_until'),
  globalWarmingPotential: decimal('global_warming_potential', { precision: 10, scale: 2 }),
  declaredUnit: varchar('declared_unit', { length: 100 }),
  
  // Compliance & Standards
  fireRating: varchar('fire_rating', { length: 50 }),
  fireRatingStandard: varchar('fire_rating_standard', { length: 100 }),
  thermalRValue: decimal('thermal_r_value', { precision: 8, scale: 2 }),
  thermalUValue: decimal('thermal_u_value', { precision: 8, scale: 4 }),
  vocLevel: varchar('voc_level', { length: 50 }),
  vocCertification: varchar('voc_certification', { length: 100 }),
  
  // Durability & Warranty
  expectedLifecycleYears: integer('expected_lifecycle_years'),
  manufacturerWarrantyYears: integer('manufacturer_warranty_years'),
  
  // Sourcing & Supply Chain
  leadTimeDays: integer('lead_time_days'),
  usManufactured: boolean('us_manufactured').default(false),
  regionalAvailabilityMiles: integer('regional_availability_miles'),
  
  // Certifications (boolean flags)
  hasEpd: boolean('has_epd').default(false),
  hasHpd: boolean('has_hpd').default(false),
  hasFsc: boolean('has_fsc').default(false),
  hasC2c: boolean('has_c2c').default(false),
  hasGreenguard: boolean('has_greenguard').default(false),
  onRedList: boolean('on_red_list').default(false),
  
  // Pricing
  pricePerUnit: decimal('price_per_unit', { precision: 10, scale: 2 }),
  priceUnit: varchar('price_unit', { length: 50 }),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  dataSource: varchar('data_source', { length: 100 }),
}, (table) => ({
  categoryIdx: index('idx_materials_category').on(table.category),
  manufacturerIdx: index('idx_materials_manufacturer').on(table.manufacturerId),
  epdNumberIdx: index('idx_materials_epd_number').on(table.epdNumber),
}));

// Assemblies Table
export const assemblies = pgTable('assemblies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  assemblyType: varchar('assembly_type', { length: 100 }).notNull(),
  location: varchar('location', { length: 100 }),
  description: text('description'),
  
  // Assembly Composition
  componentCount: integer('component_count'),
  totalThicknessInches: decimal('total_thickness_inches', { precision: 8, scale: 2 }),
  
  // Environmental Performance
  totalGwpPer1000Sqft: decimal('total_gwp_per_1000_sqft', { precision: 10, scale: 2 }),
  totalGwpPerSqm: decimal('total_gwp_per_sqm', { precision: 10, scale: 2 }),
  
  // Performance Metrics
  totalRValue: decimal('total_r_value', { precision: 8, scale: 2 }),
  fireRating: varchar('fire_rating', { length: 50 }),
  soundTransmissionClass: integer('sound_transmission_class'),
  
  // Sourcing
  leadTimeDays: integer('lead_time_days'),
  usSourcingPercentage: integer('us_sourcing_percentage'),
  
  // Metadata
  sourceDocument: varchar('source_document', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  assemblyTypeIdx: index('idx_assemblies_assembly_type').on(table.assemblyType),
  locationIdx: index('idx_assemblies_location').on(table.location),
}));

// Assembly_Components Table
export const assemblyComponents = pgTable('assembly_components', {
  id: uuid('id').primaryKey().defaultRandom(),
  assemblyId: uuid('assembly_id').notNull().references(() => assemblies.id, { onDelete: 'cascade' }),
  materialId: uuid('material_id').notNull().references(() => materials.id),
  
  // Component Details
  layerOrder: integer('layer_order').notNull(),
  layerName: varchar('layer_name', { length: 100 }),
  thicknessInches: decimal('thickness_inches', { precision: 8, scale: 2 }),
  quantityPerSqft: decimal('quantity_per_sqft', { precision: 10, scale: 4 }),
  
  // Component-Specific Performance
  rValueContribution: decimal('r_value_contribution', { precision: 8, scale: 2 }),
  gwpContributionPerSqft: decimal('gwp_contribution_per_sqft', { precision: 10, scale: 4 }),
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  assemblyIdx: index('idx_assembly_components_assembly').on(table.assemblyId),
  materialIdx: index('idx_assembly_components_material').on(table.materialId),
  uniqueComponent: unique('unique_assembly_material_layer').on(table.assemblyId, table.materialId, table.layerOrder),
}));

// Material_Certifications Table
export const materialCertifications = pgTable('material_certifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  materialId: uuid('material_id').notNull().references(() => materials.id, { onDelete: 'cascade' }),
  
  certificationType: varchar('certification_type', { length: 100 }).notNull(),
  certificationName: varchar('certification_name', { length: 255 }),
  certificationNumber: varchar('certification_number', { length: 100 }),
  issuingBody: varchar('issuing_body', { length: 255 }),
  
  issueDate: timestamp('issue_date'),
  expirationDate: timestamp('expiration_date'),
  certificationUrl: text('certification_url'),
  
  // LEED Contribution
  leedCreditCategory: varchar('leed_credit_category', { length: 100 }),
  leedCreditNumber: varchar('leed_credit_number', { length: 50 }),
  leedPointsValue: integer('leed_points_value'),  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  materialIdx: index('idx_material_suppliers_material').on(table.materialId),erialId),
  certificationTypeIdx: index('idx_material_certifications_type').on(table.certificationType),
}));

// CCPS_Baselines Table
export const ccpsBaselines = pgTable('ccps_baselines', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: varchar('category', { length: 100 }).notNull().unique(),
  
  // Baseline Material Reference
  baselineMaterialId: uuid('baseline_material_id').references(() => materials.id),
  baselineMaterialName: varchar('baseline_material_name', { length: 255 }),
  
  // Baseline Metrics
  baselineGwpPerUnit: decimal('baseline_gwp_per_unit', { precision: 10, scale: 2 }),
  baselinePricePerUnit: decimal('baseline_price_per_unit', { precision: 10, scale: 2 }),
  baselineLeadTimeDays: integer('baseline_lead_time_days'),
  
  // Category Averages
  categoryAvgGwp: decimal('category_avg_gwp', { precision: 10, scale: 2 }),
  categoryAvgPrice: decimal('category_avg_price', { precision: 10, scale: 2 }),
  categoryAvgLeadTime: integer('category_avg_lead_time'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Decision_Maker_Personas Table
export const decisionMakerPersonas = pgTable('decision_maker_personas', {
  id: uuid('id').primaryKey().defaultRandom(),
  personaName: varchar('persona_name', { length: 100 }).notNull().unique(),
  personaDescription: text('persona_description'),
  
  // CCPS Metric Weights
  carbonWeight: decimal('carbon_weight', { precision: 5, scale: 2 }).default('25.00'),
  complianceWeight: decimal('compliance_weight', { precision: 5, scale: 2 }).default('20.00'),
  certificationWeight: decimal('certification_weight', { precision: 5, scale: 2 }).default('20.00'),
  costWeight: decimal('cost_weight', { precision: 5, scale: 2 }).default('15.00'),
  supplyChainWeight: decimal('supply_chain_weight', { precision: 5, scale: 2 }).default('12.00'),
  healthWeight: decimal('health_weight', { precision: 5, scale: 2 }).default('8.00'),
  
  // Decision Logic
  primaryDriver: varchar('primary_driver', { length: 255 }),
  keyConcerns: text('key_concerns'),
  
  // Targeting Information
  typicalJobTitles: text('typical_job_titles'),
  industryAssociations: text('industry_associations'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// CCPS_Scores Table
export const ccpsScores = pgTable('ccps_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  materialId: uuid('material_id').notNull().references(() => materials.id, { onDelete: 'cascade' }),
  
  // Decision-Maker Persona
  decisionMakerPersona: varchar('decision_maker_persona', { length: 100 }),
  
  // Individual Metric Scores (0-100)
  carbonScore: integer('carbon_score'),
  complianceScore: integer('compliance_score'),
  certificationScore: integer('certification_score'),
  costScore: integer('cost_score'),
  supplyChainScore: integer('supply_chain_score'),
  healthScore: integer('health_score'),
  
  // Weighted CCPS (0-100)
  ccpsScore: integer('ccps_score'),
  
  // Metric Breakdown
  carbonWeight: decimal('carbon_weight', { precision: 5, scale: 2 }),
  complianceWeight: decimal('compliance_weight', { precision: 5, scale: 2 }),
  certificationWeight: decimal('certification_weight', { precision: 5, scale: 2 }),
  costWeight: decimal('cost_weight', { precision: 5, scale: 2 }),
  supplyChainWeight: decimal('supply_chain_weight', { precision: 5, scale: 2 }),
  healthWeight: decimal('health_weight', { precision: 5, scale: 2 }),
  
  // Sourcing Difficulty (1-5 scale)
  sourcingDifficulty: integer('sourcing_difficulty'),
  
  // Metadata
  calculatedAt: timestamp('calculated_at').defaultNow(),
  validUntil: timestamp('valid_until'),
}, (table) => ({
  materialIdx: index('idx_ccps_scores_material').on(table.materialId),
  personaIdx: index('idx_ccps_scores_persona').on(table.decisionMakerPersona),
  ccpsScoreIdx: index('idx_ccps_scores_ccps').on(table.ccpsScore),
  uniqueScore: unique('unique_material_persona').on(table.materialId, table.decisionMakerPersona),
}));

// Material_Suppliers Table
export const materialSuppliers = pgTable('material_suppliers', {
  id: uuid('id').primaryKey().defaultRandom(),
  materialId: uuid('material_id').notNull().references(() => materials.id, { onDelete: 'cascade' }),
  supplierId: uuid('supplier_id').notNull().references(() => manufacturers.id),
  
  // Supplier-Specific Information
  supplierSku: varchar('supplier_sku', { length: 100 }),
  supplierPrice: decimal('supplier_price', { precision: 10, scale: 2 }),
  supplierLeadTimeDays: integer('supplier_lead_time_days'),
  
  // Inventory Status
  inStock: boolean('in_stock').default(false),
  stockQuantity: integer('stock_quantity'),
  
  // Regional Information
  supplierRegion: varchar('supplier_region', { length: 100 }),
  supplierState: varchar('supplier_state', { length: 50 }),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  categoryIdx: index('idx_materials_category').on(table.category),aterialId),
  supplierIdx: index('idx_material_suppliers_supplier').on(table.supplierId),
  uniqueSupplier: unique('unique_material_supplier').on(table.materialId, table.supplierId),
}));

// Material_Search_History Table
export const materialSearchHistory = pgTable('material_search_history', {
  id: uuid('id').primaryKey().defaultRandom(),  userId: uuid('user_id'),.references(() => sql`users(id)`),
  
  searchQuery: varchar('search_query', { length: 255 }),
  searchCategory: varchar('search_category', { length: 100 }),
  decisionMakerPersona: varchar('decision_maker_persona', { length: 100 }),
  
  // Results Clicked
  materialIdClicked: uuid('material_id_clicked').references(() => materials.id),
  assemblyIdClicked: uuid('assembly_id_clicked').references(() => assemblies.id),
  
  // Engagement
  timeOnResultsSeconds: integer('time_on_results_seconds'),
  materialCardsViewed: integer('material_cards_vie  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdx: index('idx_material_search_history_user').on(table.userId),reatedIdx: index('idx_material_search_history_created').on(table.createdAt),
}));

// Type exports for use in application
export type Manufacturer = typeof manufacturers.$inferSelect;
export type Material = typeof materials.$inferSelect;
export type Assembly = typeof assemblies.$inferSelect;
export type AssemblyComponent = typeof assemblyComponents.$inferSelect;
export type MaterialCertification = typeof materialCertifications.$inferSelect;
export type CcpsBaseline = typeof ccpsBaselines.$inferSelect;
export type DecisionMakerPersona = typeof decisionMakerPersonas.$inferSelect;
export type CcpsScore = typeof ccpsScores.$inferSelect;
export type MaterialSupplier = typeof materialSuppliers.$inferSelect;
export type MaterialSearchHistory = typeof materialSearchHistory.$inferSelect;
