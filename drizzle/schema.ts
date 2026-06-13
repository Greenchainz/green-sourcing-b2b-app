import {
  pgTable,
  pgEnum,
  serial,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  integer,
  real,
  date,
  json,
  index,
  uniqueIndex,
  customType,
} from "drizzle-orm/pg-core";

// bytea custom type — used by email_credentials (managed via raw SQL in email-auth.ts)
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

// pgvector custom type — stores embeddings for semantic search
export const vector = customType<{
  data: number[];
  driverData: string;
  config: { dimensions: number };
}>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 1536})`;
  },
  fromDriver(value: string): number[] {
    return value
      .replace(/[\[\]]/g, "")
      .split(",")
      .map(Number);
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
});

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["user", "admin", "buyer", "supplier"]);
export const userPersonaEnum = pgEnum("user_persona", [
  "architect", "leed_ap", "gc_pm", "spec_writer", "owner", "facility_manager", "default",
]);
export const materialSpecStatusEnum = pgEnum("material_spec_status", ["pending", "approved", "rejected"]);
export const complianceGradeEnum = pgEnum("compliance_grade", ["A", "B", "C", "D", "F"]);
export const sustainabilityTierEnum = pgEnum("sustainability_tier", ["good", "better", "best"]);
export const rfqStatusEnum = pgEnum("rfq_status", ["draft", "submitted", "responded", "awarded", "closed"]);
export const rfqBidStatusEnum = pgEnum("rfq_bid_status", ["submitted", "accepted", "rejected", "expired"]);
export const rfqThreadStatusEnum = pgEnum("rfq_thread_status", ["active", "closed", "archived"]);
export const senderTypeEnum = pgEnum("sender_type", ["buyer", "supplier"]);
export const messageSenderTypeEnum = pgEnum("message_sender_type", ["user", "agent", "support"]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "rfq_new", "rfq_match", "new_message", "bid_accepted", "bid_rejected", "rfq_closed", "rfq_bid_received",
]);
export const agentRoleEnum = pgEnum("agent_role", ["user", "assistant", "system"]);
export const swapTierEnum = pgEnum("swap_tier", ["good", "better", "best"]);
export const createdByEnum = pgEnum("created_by", ["algorithm", "agent", "admin"]);
export const agentModeEnum = pgEnum("agent_mode", ["agent_first", "human_only", "hybrid"]);
export const handoffStatusEnum = pgEnum("handoff_status", ["agent", "pending_handoff", "human"]);
export const handoffModeEnum = pgEnum("handoff_mode", ["always_agent", "hybrid", "immediate_human"]);
export const callTypeEnum = pgEnum("call_type", ["voice", "video"]);
export const callStatusEnum = pgEnum("call_status", ["completed", "missed", "rejected", "failed"]);
export const videoCallStatusEnum = pgEnum("video_call_status", ["initiated", "ringing", "connected", "ended", "failed"]);
export const subscriptionTierEnum = pgEnum("subscription_tier", ["free", "standard", "premium"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "suspended", "cancelled", "expired"]);
export const supplierTierEnum = pgEnum("supplier_tier", ["free", "standard", "premium"]);
export const supplierStatusEnum = pgEnum("supplier_status", ["active", "canceled", "past_due", "suspended", "pending"]);
export const buyerStatusEnum = pgEnum("buyer_status", ["active", "canceled", "past_due", "suspended", "pending", "trial"]);
export const verificationStatusEnum = pgEnum("verification_status", ["pending", "approved", "rejected"]);
export const supplierVerifiedBadgeStatusEnum = pgEnum("supplier_verified_badge_status", ["UNVERIFIED", "PARTIAL", "VERIFIED"]);
export const usageDimensionEnum = pgEnum("usage_dimension", [
  "rfq_submission", "ai_query", "swap_analysis", "ccps_export",
  "material_comparison", "supplier_match", "message_thread",
  "bid_submission", "video_call", "message_sent",
]);
export const swapValidationStatusEnum = pgEnum("swap_validation_status", ["APPROVED", "EXPERIMENTAL", "REJECTED"]);
export const firmTypeEnum = pgEnum("firm_type", [
  "architecture_firm", "engineering_firm", "owner_developer", "contractor", "consultant",
]);
export const annualProjectVolumeEnum = pgEnum("annual_project_volume", [
  "under_1m", "1m_10m", "10m_50m", "over_50m",
]);
export const architectStatusEnum = pgEnum("architect_status", ["pending", "active"]);
export const submittalStatusEnum = pgEnum("submittal_status", [
  "draft",
  "submitted",
  "approved_as_noted",
  "revise_and_resubmit",
  "rejected",
  "closed",
]);
export const submittalBallInCourtEnum = pgEnum("submittal_ball_in_court", [
  "buyer",
  "architect",
  "supplier",
]);
export const caDocumentTypeEnum = pgEnum("ca_document_type", ["rfi", "change_request"]);
export const caDocumentStatusEnum = pgEnum("ca_document_status", [
  "draft",
  "open",
  "answered",
  "pending_approval",
  "approved",
  "rejected",
  "closed",
]);

// ─── Users ──────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  persona: userPersonaEnum("persona").default("default"),
  companyName: varchar("companyName", { length: 255 }),
  jobTitle: varchar("jobTitle", { length: 255 }),
  linkedinVerified: boolean("linkedin_verified").default(false),
  linkedinProfileUrl: varchar("linkedin_profile_url", { length: 500 }),
  linkedinVerifiedAt: timestamp("linkedin_verified_at"),
  avatarUrl: text("avatarUrl"),
  acsUserId: text("acs_user_id"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Manufacturers ──────────────────────────────────────────────────────────

export const manufacturers = pgTable("manufacturers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  website: text("website"),
  logoUrl: text("logoUrl"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  headquarters: varchar("headquarters", { length: 255 }),
  sustainabilityPageUrl: text("sustainabilityPageUrl"),
  verified: boolean("verified").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  subcategory: varchar("subcategory", { length: 100 }),
  location: varchar("location", { length: 255 }),
  keyProduct: varchar("keyProduct", { length: 255 }),
  pitchAngle: text("pitchAngle"),
  hasEpd: boolean("hasEpd").default(false),
  readinessLevel: varchar("readinessLevel", { length: 20 }),
  claimed: boolean("claimed").default(false),
  claimedByUserId: integer("claimedByUserId"),
  claimedAt: timestamp("claimedAt"),
  profileViews: integer("profileViews").default(0),
  featured: boolean("featured").default(false),
  dataSource: varchar("dataSource", { length: 100 }),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Manufacturer = typeof manufacturers.$inferSelect;

// ─── Materials ──────────────────────────────────────────────────────────────

export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  productName: varchar("productName", { length: 255 }),
  manufacturerId: integer("manufacturerId"),
  category: varchar("category", { length: 100 }).notNull(),
  subcategory: varchar("subcategory", { length: 100 }),
  description: text("description"),
  epdNumber: varchar("epdNumber", { length: 100 }),
  epdUrl: text("epdUrl"),
  epdExpiry: timestamp("epdExpiry"),
  epdProgramOperator: varchar("epdProgramOperator", { length: 150 }),
  gwpValue: decimal("gwpValue", { precision: 12, scale: 4 }),
  gwpUnit: varchar("gwpUnit", { length: 50 }),
  declaredUnit: varchar("declaredUnit", { length: 100 }),
  msfFactor: decimal("msfFactor", { precision: 10, scale: 4 }),
  embodiedCarbonPer1000sf: decimal("embodiedCarbonPer1000sf", { precision: 12, scale: 2 }),
  rValue: decimal("rValue", { precision: 8, scale: 2 }),
  fireRating: varchar("fireRating", { length: 50 }),
  fireRatingStandard: varchar("fireRatingStandard", { length: 100 }),
  thermalUValue: decimal("thermalUValue", { precision: 8, scale: 4 }),
  vocLevel: varchar("vocLevel", { length: 50 }),
  vocCertification: varchar("vocCertification", { length: 100 }),
  onRedList: boolean("onRedList").default(false),
  hasEpd: boolean("hasEpd").default(false),
  hasHpd: boolean("hasHpd").default(false),
  hasFsc: boolean("hasFsc").default(false),
  hasC2c: boolean("hasC2c").default(false),
  hasGreenguard: boolean("hasGreenguard").default(false),
  hasDeclare: boolean("hasDeclare").default(false),
  recycledContentPct: decimal("recycledContentPct", { precision: 5, scale: 2 }),
  leadTimeDays: integer("leadTimeDays"),
  usManufactured: boolean("usManufactured").default(false),
  regionalAvailabilityMiles: integer("regionalAvailabilityMiles"),
  hasTakeBackProgram: boolean("hasTakeBackProgram").default(false),
  pricePerUnit: decimal("pricePerUnit", { precision: 10, scale: 2 }),
  priceUnit: varchar("priceUnit", { length: 50 }),
  astmStandards: text("astmStandards"),
  meetsTitle24: boolean("meetsTitle24").default(false),
  meetsIecc: boolean("meetsIecc").default(false),
  leedCredits: text("leedCredits"),
  expectedLifecycleYears: integer("expectedLifecycleYears"),
  warrantyYears: integer("warrantyYears"),
  dataSource: varchar("dataSource", { length: 100 }),
  verified: boolean("verified").default(false),
  imageUrl: text("imageUrl"),
  specSheetUrl: text("specSheetUrl"),
  ec3Id: varchar("ec3Id", { length: 100 }),
  ec3SyncedAt: timestamp("ec3SyncedAt"),
  ec3Category: varchar("ec3Category", { length: 100 }),
  ec3ConservativeEstimate: varchar("ec3ConservativeEstimate", { length: 50 }),
  ec3BestPractice: varchar("ec3BestPractice", { length: 50 }),
  ec3IndustryMedian: varchar("ec3IndustryMedian", { length: 50 }),
  complianceGrade: complianceGradeEnum("complianceGrade").default("C"),
  // ─── 7-Layer Procurement Fields ──────────────────────────────────────────
  // Layer 1: Design Authorities — liability, code, toxic tort
  cdphCompliant: boolean("cdphCompliant").default(false),
  weightPerSf: decimal("weightPerSf", { precision: 8, scale: 3 }),
  // Layer 2: Financial Gatekeepers — WLC, ROI, whole-life cost
  wlcPaybackYears: integer("wlcPaybackYears"),
  annualEnergySavingsPct: decimal("annualEnergySavingsPct", { precision: 5, scale: 2 }),
  maintenanceCostPerSfPerYear: decimal("maintenanceCostPerSfPerYear", { precision: 8, scale: 2 }),
  // Layer 4: Operational Stewards — FM, cleaning, TCO
  isSeamless: boolean("isSeamless").default(false),
  bleachResistant: boolean("bleachResistant").default(false),
  cleaningProtocol: varchar("cleaningProtocol", { length: 120 }),
  // Layer 5: C-Suite — Scope 3, ESG reporting
  scope3EmissionsKgCo2e: decimal("scope3EmissionsKgCo2e", { precision: 10, scale: 3 }),
  carbonScore: decimal("carbon_score", { precision: 5, scale: 2 }),
  // Layer 6: Sector Verticals — healthcare, K-12, retail, etc.
  sectorTags: text("sectorTags").array(),
  // Layer 7: Supply Chain — cooperative purchasing, LEED doc readiness
  sourcewellListed: boolean("sourcewellListed").default(false),
  leedDocReady: boolean("leedDocReady").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  ccpsScore: real("ccps_score"),
  // Semantic search: pgvector embedding (text-embedding-3-small, 1536 dim)
  embedding: vector("embedding", { dimensions: 1536 }),
  searchText: text("searchText"),
});

export type Material = typeof materials.$inferSelect;

// ─── Assemblies ─────────────────────────────────────────────────────────────

export const assemblies = pgTable("assemblies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }),
  assemblyType: varchar("assemblyType", { length: 100 }).notNull(),
  description: text("description"),
  sustainabilityTier: sustainabilityTierEnum("sustainabilityTier").default("good"),
  totalGwpPer1000Sqft: decimal("totalGwpPer1000Sqft", { precision: 12, scale: 2 }),
  totalRValue: decimal("totalRValue", { precision: 8, scale: 2 }),
  estimatedCostPer1000Sqft: decimal("estimatedCostPer1000Sqft", { precision: 10, scale: 2 }),
  fireRating: varchar("fireRating", { length: 50 }),
  // ─── Performance metrics ─────────────────────────────────────────────────
  stcRating: integer("stcRating"),
  iicRating: integer("iicRating"),
  airPermeance: varchar("airPermeance", { length: 120 }),
  vaporPermeance: varchar("vaporPermeance", { length: 120 }),
  windUpliftRating: varchar("windUpliftRating", { length: 120 }),
  flameSpreadIndex: integer("flameSpreadIndex"),
  smokeDevelopmentIndex: integer("smokeDevelopmentIndex"),
  ulDesignNumber: varchar("ulDesignNumber", { length: 80 }),
  loadCapacityPsf: integer("loadCapacityPsf"),
  impactResistance: varchar("impactResistance", { length: 200 }),
  leedCredits: text("leedCredits"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Assembly = typeof assemblies.$inferSelect;

// ─── Assembly Components ────────────────────────────────────────────────────

export const assemblyComponents = pgTable("assembly_components", {
  id: serial("id").primaryKey(),
  assemblyId: integer("assemblyId").notNull(),
  materialId: integer("materialId"),
  layerOrder: integer("layerOrder").notNull(),
  layerName: varchar("layerName", { length: 255 }).notNull(),
  thickness: varchar("thickness", { length: 50 }),
  gwpContribution: decimal("gwpContribution", { precision: 12, scale: 4 }),
  notes: text("notes"),
});

export type AssemblyComponent = typeof assemblyComponents.$inferSelect;

// ─── Material Certifications ────────────────────────────────────────────────

export const materialCertifications = pgTable("material_certifications", {
  id: serial("id").primaryKey(),
  materialId: integer("materialId").notNull(),
  certificationType: varchar("certificationType", { length: 100 }).notNull(),
  certificationName: varchar("certificationName", { length: 255 }),
  certificationNumber: varchar("certificationNumber", { length: 100 }),
  issuingBody: varchar("issuingBody", { length: 255 }),
  issueDate: timestamp("issueDate"),
  expirationDate: timestamp("expirationDate"),
  certificationUrl: text("certificationUrl"),
  leedCreditCategory: varchar("leedCreditCategory", { length: 100 }),
  leedCreditNumber: varchar("leedCreditNumber", { length: 50 }),
  leedPointsValue: integer("leedPointsValue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MaterialCertification = typeof materialCertifications.$inferSelect;

// ─── Material Specifications (Supplier-Submitted) ───────────────────────────

export const materialSpecs = pgTable("material_specs", {
  id: serial("id").primaryKey(),
  materialId: integer("materialId").notNull(),
  supplierId: integer("supplierId").notNull(),
  submittedBy: integer("submittedBy").notNull(),
  status: materialSpecStatusEnum("status").default("pending").notNull(),
  fireRating: varchar("fireRating", { length: 50 }),
  fireRatingStandard: varchar("fireRatingStandard", { length: 100 }),
  rValue: decimal("rValue", { precision: 8, scale: 2 }),
  thermalUValue: decimal("thermalUValue", { precision: 8, scale: 4 }),
  compressiveStrength: varchar("compressiveStrength", { length: 100 }),
  tensileStrength: varchar("tensileStrength", { length: 100 }),
  astmStandards: text("astmStandards"),
  meetsTitle24: boolean("meetsTitle24").default(false),
  meetsIecc: boolean("meetsIecc").default(false),
  buildingCodes: text("buildingCodes"),
  pricePerUnit: decimal("pricePerUnit", { precision: 10, scale: 2 }),
  priceUnit: varchar("priceUnit", { length: 50 }),
  minimumOrderQuantity: integer("minimumOrderQuantity"),
  moqUnit: varchar("moqUnit", { length: 50 }),
  bulkDiscountAvailable: boolean("bulkDiscountAvailable").default(false),
  leadTimeDays: integer("leadTimeDays"),
  manufacturingLocation: varchar("manufacturingLocation", { length: 255 }),
  usManufactured: boolean("usManufactured").default(false),
  regionalAvailabilityMiles: integer("regionalAvailabilityMiles"),
  shippingRegions: text("shippingRegions"),
  inStock: boolean("inStock").default(true),
  stockQuantity: integer("stockQuantity"),
  vocLevel: varchar("vocLevel", { length: 50 }),
  vocCertification: varchar("vocCertification", { length: 100 }),
  onRedList: boolean("onRedList").default(false),
  toxicityRating: varchar("toxicityRating", { length: 50 }),
  indoorAirQualityRating: varchar("indoorAirQualityRating", { length: 50 }),
  hasEpd: boolean("hasEpd").default(false),
  hasHpd: boolean("hasHpd").default(false),
  hasFsc: boolean("hasFsc").default(false),
  hasC2c: boolean("hasC2c").default(false),
  hasGreenguard: boolean("hasGreenguard").default(false),
  hasDeclare: boolean("hasDeclare").default(false),
  certificationUrls: text("certificationUrls"),
  datasheetUrl: text("datasheetUrl"),
  specSheetUrl: text("specSheetUrl"),
  testReportUrls: text("testReportUrls"),
  notes: text("notes"),
  recycledContentPct: decimal("recycledContentPct", { precision: 5, scale: 2 }),
  warrantyYears: integer("warrantyYears"),
  expectedLifecycleYears: integer("expectedLifecycleYears"),
  reviewedBy: integer("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  rejectionReason: text("rejectionReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type MaterialSpec = typeof materialSpecs.$inferSelect;
export type InsertMaterialSpec = typeof materialSpecs.$inferInsert;

// ─── CCPS Baselines ─────────────────────────────────────────────────────────

export const ccpsBaselines = pgTable("ccps_baselines", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 100 }).notNull(),
  baselineGwpPerUnit: decimal("baselineGwpPerUnit", { precision: 12, scale: 4 }),
  baselinePricePerUnit: decimal("baselinePricePerUnit", { precision: 10, scale: 2 }),
  baselineLeadTimeDays: integer("baselineLeadTimeDays"),
  baselineRecycledPct: decimal("baselineRecycledPct", { precision: 5, scale: 2 }),
  sampleSize: integer("sampleSize"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type CcpsBaseline = typeof ccpsBaselines.$inferSelect;

// ─── CCPS Scores (cached) ───────────────────────────────────────────────────

export const ccpsScores = pgTable("ccps_scores", {
  id: serial("id").primaryKey(),
  materialId: integer("materialId").notNull(),
  personaKey: varchar("personaKey", { length: 50 }).notNull(),
  carbonScore: integer("carbonScore"),
  complianceScore: integer("complianceScore"),
  certificationScore: integer("certificationScore"),
  costScore: integer("costScore"),
  supplyChainScore: integer("supplyChainScore"),
  healthScore: integer("healthScore"),
  ccpsTotal: integer("ccpsTotal"),
  sourcingDifficulty: integer("sourcingDifficulty"),
  calculatedAt: timestamp("calculatedAt").defaultNow().notNull(),
});

export type CcpsScore = typeof ccpsScores.$inferSelect;

// ─── Decision Maker Personas ────────────────────────────────────────────────

export const decisionMakerPersonas = pgTable("decision_maker_personas", {
  id: serial("id").primaryKey(),
  personaKey: varchar("personaKey", { length: 50 }).notNull(),
  title: varchar("title", { length: 100 }).notNull(),
  description: text("description"),
  carbonWeight: decimal("carbonWeight", { precision: 4, scale: 2 }),
  complianceWeight: decimal("complianceWeight", { precision: 4, scale: 2 }),
  certificationWeight: decimal("certificationWeight", { precision: 4, scale: 2 }),
  costWeight: decimal("costWeight", { precision: 4, scale: 2 }),
  supplyChainWeight: decimal("supplyChainWeight", { precision: 4, scale: 2 }),
  healthWeight: decimal("healthWeight", { precision: 4, scale: 2 }),
}, (table) => ({
  personaKeyIdx: uniqueIndex("idx_decision_maker_personas_persona_key").on(table.personaKey),
}));

export type DecisionMakerPersona = typeof decisionMakerPersonas.$inferSelect;

// ─── RFQs ───────────────────────────────────────────────────────────────────

export const rfqs = pgTable("rfqs", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  projectName: varchar("projectName", { length: 255 }).notNull(),
  projectLocation: varchar("projectLocation", { length: 255 }),
  projectType: varchar("projectType", { length: 100 }),
  status: rfqStatusEnum("status").default("draft"),
  notes: text("notes"),
  requiredCertifications: json("requiredCertifications").$type<string[]>(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  geocodedAt: timestamp("geocoded_at"),
  geocodeSource: varchar("geocode_source", { length: 32 }),
  projectClimateZone: varchar("project_climate_zone", { length: 10 }),
  dueDate: timestamp("dueDate"),
  depositVerified: boolean("deposit_verified").default(false),
  depositPaymentIntentId: varchar("deposit_payment_intent_id", { length: 255 }),
  depositAmount: decimal("deposit_amount"),
  // ── Smart RFx Builder additions ─────────────────────────────────────────────
  requestType: varchar("request_type", { length: 40 }).default("rfq_quote"),
  responseFieldSchema: json("response_field_schema").$type<Array<{ key: string; label: string; fieldType: string; required: boolean; category: string; helpText?: string }>>(),
  scoringWeights: json("scoring_weights").$type<{ price: number; carbon: number; leadTime: number; documentation: number; certifications: number }>(),
  // ── Internal Carbon Pricing (Shadow Price) ───────────────────────────────────
  // Buyer-set $/tonne CO₂e — used to compute carbon-adjusted cost in comparison table.
  // Formula: Carbon-Adjusted Cost = Bid Price + (GWP_kg / 1000 × shadowCarbonPrice)
  shadowCarbonPrice: decimal("shadow_carbon_price", { precision: 10, scale: 2 }),
  // ── First-class carbon / sustainability gate fields ──────────────────────────
  // Hard cap: bids above this GWP are flagged non-compliant (null = no cap).
  // Typical concrete values: 200–500 kgCO2e/m3; steel: 1,000–3,000 kgCO2e/tonne.
  // Negative values are not meaningful — validate > 0 at the application layer.
  gwpCapPerUnit: decimal("gwp_cap_per_unit", { precision: 10, scale: 4 }),
  // Unit string for gwpCapPerUnit, e.g. "kgCO2e/m3" or "kgCO2e/tonne".
  gwpCapUnit: varchar("gwp_cap_unit", { length: 50 }),
  // Percentage reduction below regional baseline buyer is targeting (null = not set).
  gwpReductionTarget: decimal("gwp_reduction_target", { precision: 5, scale: 2 }),
  // When true, bids without a valid EPD link are treated as non-compliant.
  epdRequired: boolean("epd_required").default(false).notNull(),
  // ── Compliance / Data Retention ──────────────────────────────────────────────
  // Soft-delete timestamp. Rows where this is non-null are logically deleted.
  // Hard deletes are prohibited per the 7-year retention policy.
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Rfq = typeof rfqs.$inferSelect;

// ─── RFQ Items ──────────────────────────────────────────────────────────────

export const rfqItems = pgTable("rfq_items", {
  id: serial("id").primaryKey(),
  rfqId: integer("rfqId").notNull(),
  materialId: integer("materialId"),
  assemblyId: integer("assemblyId"),
  quantity: decimal("quantity", { precision: 12, scale: 2 }),
  quantityUnit: varchar("quantityUnit", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  // Soft-delete — see retention policy note on rfqs table.
  deletedAt: timestamp("deleted_at"),
});

export type RfqItem = typeof rfqItems.$inferSelect;

// ─── Leads ──────────────────────────────────────────────────────────────────

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 255 }),
  company: varchar("company", { length: 255 }),
  source: varchar("source", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;

// ─── Agent Conversations ───────────────────────────────────────────────────

export const agentConversations = pgTable("agent_conversations", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  sessionId: varchar("sessionId", { length: 255 }).notNull(),
  agent: varchar("agent", { length: 50 }).notNull(),
  role: agentRoleEnum("role").notNull(),
  content: text("content").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentConversation = typeof agentConversations.$inferSelect;

// ─── Agent Analytics ───────────────────────────────────────────────────────

export const agentAnalytics = pgTable("agent_analytics", {
  id: serial("id").primaryKey(),
  sessionId: varchar("sessionId", { length: 255 }).notNull(),
  agent: varchar("agent", { length: 50 }).notNull(),
  intentClassified: varchar("intentClassified", { length: 100 }),
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  toolsUsed: text("toolsUsed"),
  responseTimeMs: integer("responseTimeMs"),
  escalated: boolean("escalated").default(false),
  handedOffToHuman: boolean("handedOffToHuman").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentAnalytic = typeof agentAnalytics.$inferSelect;

// ─── Suppliers ──────────────────────────────────────────────────────────────

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  website: text("website"),
  logoUrl: text("logoUrl"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }).notNull(),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zipCode: varchar("zipCode", { length: 20 }),
  country: varchar("country", { length: 100 }),
  isPremium: boolean("isPremium").default(false),
  premiumExpiresAt: timestamp("premiumExpiresAt"),
  sustainabilityScore: decimal("sustainabilityScore", { precision: 3, scale: 2 }),
  verified: boolean("verified").default(false),
  verificationStatus: verificationStatusEnum("verificationStatus").default("pending").notNull(),
  verifiedAt: timestamp("verifiedAt"),
  verifiedSupplierStatus: supplierVerifiedBadgeStatusEnum("verified_supplier_status").default("UNVERIFIED").notNull(),
  verifiedSupplierReasons: json("verified_supplier_reasons").$type<string[]>().default([]).notNull(),
  verifiedSupplierComputedAt: timestamp("verified_supplier_computed_at"),
  verifiedSupplierExpiresAt: timestamp("verified_supplier_expires_at"),
  description: text("description"),
  location: varchar("location", { length: 255 }),
  contactName: varchar("contactName", { length: 255 }),
  materialCategories: json("materialCategories").$type<string[]>(),
  certifications: json("certifications").$type<string[]>(),
  epdUrl: text("epdUrl"),
  epdProgramOperator: varchar("epdProgramOperator", { length: 150 }),
  maxOrderValue: decimal("maxOrderValue", { precision: 12, scale: 2 }),
  currentCapacity: integer("currentCapacity").default(100),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  // ── Tier & monetisation ──────────────────────────────────────────────────
  tier: supplierTierEnum("tier").default("free").notNull(),
  leadCredits: integer("leadCredits").default(3).notNull(),
  weightedRankScore: real("weightedRankScore"),
  microsoftSubscriptionId: text("microsoftSubscriptionId"),
  microsoftPlanId: text("microsoftPlanId"),
  tierUpdatedAt: timestamp("tierUpdatedAt"),
  specSheetUrl: text("specSheetUrl"),
  // ── Service area & shipping capability ──────────────────────────────────
  // Collected during onboarding. Used by matchSuppliers for distance-aware routing.
  serviceRadiusMiles: integer("serviceRadiusMiles"),             // null = use category default radius
  statesServed: json("statesServed").$type<string[]>(),          // explicit list of 2-char state codes
  shipsNationwide: boolean("shipsNationwide").default(false),    // true = no distance limit
  minOrderQuantity: decimal("minOrderQuantity", { precision: 12, scale: 2 }), // per unit (category-appropriate)
  maxOrderQuantity: decimal("maxOrderQuantity", { precision: 12, scale: 2 }), // typical project max
  // ── Supplier reliability & vetting metrics ───────────────────────────────
  // Populated by the AI Audit Agent and updated quarterly.
  // Displayed on supplier profiles as trust signals for architects.
  otifPercentage: decimal("otif_percentage", { precision: 5, scale: 2 }),    // On-Time In-Full delivery rate (0–100)
  avgLeadTimeDays: integer("avg_lead_time_days"),                              // Average days from PO to delivery
  leadTimeVarianceDays: integer("lead_time_variance_days"),                   // ±days variance (lower = more reliable)
  supplierZScore: decimal("supplier_z_score", { precision: 5, scale: 2 }),   // Altman Z-score proxy for financial health
  inventoryVisibility: boolean("inventory_visibility").default(false),        // true = real-time stock visibility available
  vetLastUpdatedAt: timestamp("vet_last_updated_at"),                         // when reliability data was last refreshed
  // ── Profile-hits outreach ────────────────────────────────────────────────
  // Last time the weekly "you got X profile views" digest was emailed to this
  // supplier. Used by runSupplierHitsDigest() to throttle to one email/week.
  hitsDigestLastSentAt: timestamp("hits_digest_last_sent_at"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

// ─── Supplier Profile Views ("hits") ─────────────────────────────────────────
// One row per (supplier, architect, day). The unique index dedupes repeated
// views by the same architect on the same day, so a "hit" = a unique architect
// who looked at the supplier on a given day. Only architect (role='buyer')
// views are recorded — that is the money-lane signal a supplier pays to see.

export const supplierProfileViews = pgTable("supplier_profile_views", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").notNull(),
  viewerUserId: integer("viewer_user_id").notNull(),
  viewerRole: varchar("viewer_role", { length: 32 }),
  source: varchar("source", { length: 48 }),
  viewDate: date("view_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  uniqDay: uniqueIndex("supplier_profile_views_unique_day").on(t.supplierId, t.viewerUserId, t.viewDate),
  bySupplier: index("supplier_profile_views_supplier_idx").on(t.supplierId),
  byViewer: index("supplier_profile_views_viewer_idx").on(t.viewerUserId),
}));

export type SupplierProfileView = typeof supplierProfileViews.$inferSelect;
export type InsertSupplierProfileView = typeof supplierProfileViews.$inferInsert;

// ─── Architects ──────────────────────────────────────────────────────────────

export const architects = pgTable("architects", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(), // one profile per user
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  firmName: varchar("firmName", { length: 255 }).notNull(),
  firmType: firmTypeEnum("firmType").notNull(),
  licenseNumber: varchar("licenseNumber", { length: 100 }),
  licenseState: varchar("licenseState", { length: 2 }),
  annualProjectVolume: annualProjectVolumeEnum("annualProjectVolume"),
  projectTypes: json("projectTypes").$type<string[]>().default([]),
  sustainabilityGoals: json("sustainabilityGoals").$type<string[]>().default([]),
  preferredCertifications: json("preferredCertifications").$type<string[]>().default([]),
  location: varchar("location", { length: 100 }),   // city
  state: varchar("state", { length: 50 }),
  zipCode: varchar("zipCode", { length: 20 }),
  primaryProjectRegion: varchar("primaryProjectRegion", { length: 50 }),
  leedAccredited: boolean("leedAccredited").default(false),
  status: architectStatusEnum("status").default("pending").notNull(),
  // ── PDF download gate ─────────────────────────────────────────────────────
  downloadCredits: integer("download_credits").default(2).notNull(),
  referralCode: varchar("referral_code", { length: 20 }).unique(),
  profileCreditsGranted: json("profile_credits_granted").$type<string[]>().default([]),
  autodeskConnected: boolean("autodesk_connected").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Architect = typeof architects.$inferSelect;
export type InsertArchitect = typeof architects.$inferInsert;

// ─── Architect Referrals ──────────────────────────────────────────────────────

export const architectReferrals = pgTable("architect_referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull(),     // architects.id of the inviter
  refereeEmail: varchar("referee_email", { length: 320 }).notNull(),
  refereeId: integer("referee_id"),                 // architects.id — set when they sign up
  creditedAt: timestamp("credited_at"),             // null until +3 credits granted to referrer
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ArchitectReferral = typeof architectReferrals.$inferSelect;

// ─── Architect Download Events ────────────────────────────────────────────────

export const architectDownloadEvents = pgTable("architect_download_events", {
  id: serial("id").primaryKey(),
  architectId: integer("architect_id").notNull(),   // architects.id
  materialId: integer("material_id").notNull(),
  // bypass method: null=standard credit, 'linkedin'=LinkedIn share, 'referral'=referral credit
  bypassMethod: varchar("bypass_method", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ArchitectDownloadEvent = typeof architectDownloadEvents.$inferSelect;

// ─── Supplier Material EPDs ──────────────────────────────────────────────────
// Supplier-owned EPD records. May optionally link to a materials catalog row.

export const supplierMaterialEpds = pgTable("supplier_material_epds", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplierId").notNull(),
  materialId: integer("materialId"),                              // null = not yet in catalog
  // Legacy column — kept for DB compatibility (prefer productName for new code)
  materialName: varchar("materialName", { length: 255 }),
  productName: varchar("productName", { length: 255 }),
  epdNumber: varchar("epdNumber", { length: 100 }),
  epdUrl: text("epdUrl"),
  // Legacy EPD columns — kept for DB compatibility
  gwpA1A3: decimal("gwpA1A3", { precision: 10, scale: 4 }),
  gwpDeclaredUnit: varchar("gwpDeclaredUnit", { length: 50 }),
  verifiedAt: timestamp("verifiedAt"),
  source: varchar("source", { length: 100 }),
  // New structured columns
  epdProgramOperator: varchar("epdProgramOperator", { length: 150 }),
  gwpValue: decimal("gwpValue", { precision: 12, scale: 4 }),
  gwpUnit: varchar("gwpUnit", { length: 50 }).default("kgCO2e"),
  declaredUnit: varchar("declaredUnit", { length: 100 }),
  externallyVerified: boolean("externallyVerified").default(false),
  expiresAt: timestamp("expiresAt"),
  status: verificationStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SupplierMaterialEpd = typeof supplierMaterialEpds.$inferSelect;
export type InsertSupplierMaterialEpd = typeof supplierMaterialEpds.$inferInsert;

// ─── Supplier Subscriptions ─────────────────────────────────────────────────

export const supplierSubscriptions = pgTable("supplier_subscriptions", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplierId").notNull(),
  tier: supplierTierEnum("tier").default("free"),
  msSubscriptionId: varchar("msSubscriptionId", { length: 255 }),
  msPlanId: varchar("msPlanId", { length: 255 }),
  status: supplierStatusEnum("status").default("active"),
  renewalDate: timestamp("renewalDate"),
  isBeta: boolean("isBeta").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SupplierSubscription = typeof supplierSubscriptions.$inferSelect;

// ─── Supplier Buyer-Fit Inputs ──────────────────────────────────────────────
// Stores per-(supplier, project-zip) inputs used to compute the buyer-fit score.
// Recomputed on RFQ events; queryable for ranking in supplier search.

export const supplierBuyerFitInputs = pgTable(
  "supplier_buyer_fit_inputs",
  {
    id: serial("id").primaryKey(),
    supplierId: integer("supplierId").notNull(),
    projectZip: text("projectZip").notNull(),
    distanceMiles: real("distanceMiles"),
    leadTimeDays: integer("leadTimeDays"),
    avgRfqResponseHours: real("avgRfqResponseHours"),
    priceIndexVsMedian: real("priceIndexVsMedian"),
    completedRfqCount: integer("completedRfqCount").default(0).notNull(),
    noShowCount: integer("noShowCount").default(0).notNull(),
    buyerFitScore: real("buyerFitScore"),
    computedAt: timestamp("computedAt").defaultNow().notNull(),
  },
  (t) => ({
    supplierIdx: index("idx_sbfi_supplier").on(t.supplierId),
    zipIdx: index("idx_sbfi_zip").on(t.projectZip),
  })
);

export type SupplierBuyerFitInput = typeof supplierBuyerFitInputs.$inferSelect;
export type InsertSupplierBuyerFitInput = typeof supplierBuyerFitInputs.$inferInsert;

// ─── Company of the Week Slots ──────────────────────────────────────────────
// One slot per calendar week; premium suppliers can claim a featured slot.

export const companyOfWeekSlots = pgTable("company_of_week_slots", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplierId").notNull(),
  weekStartDate: date("weekStartDate").notNull(),
  isPremiumSlot: boolean("isPremiumSlot").default(false).notNull(),
  showcasePageSlug: text("showcasePageSlug").notNull().unique(),
  emailSentAt: timestamp("emailSentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CompanyOfWeekSlot = typeof companyOfWeekSlots.$inferSelect;
export type InsertCompanyOfWeekSlot = typeof companyOfWeekSlots.$inferInsert;

// ─── Buyer Subscriptions ───────────────────────────────────────────────────

export const buyerSubscriptions = pgTable("buyer_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  tier: subscriptionTierEnum("tier").default("free"),
  msSubscriptionId: varchar("msSubscriptionId", { length: 255 }),
  msPlanId: varchar("msPlanId", { length: 255 }),
  status: buyerStatusEnum("status").default("active"),
  trialEndsAt: timestamp("trialEndsAt"),
  renewalDate: timestamp("renewalDate"),
  isBeta: boolean("isBeta").default(false),
  maxSeats: integer("maxSeats").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type BuyerSubscription = typeof buyerSubscriptions.$inferSelect;

// ─── Usage Tracking (Metered Billing) ──────────────────────────────────────

export const usageTracking = pgTable("usage_tracking", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  supplierId: integer("supplierId"),
  dimension: usageDimensionEnum("dimension"),
  quantity: integer("quantity").default(0).notNull(),
  videoMinutesUsed: integer("videoMinutesUsed").default(0),
  messagesCount: integer("messagesCount").default(0),
  periodStart: timestamp("periodStart"),
  periodEnd: timestamp("periodEnd"),
  reportedToMs: boolean("reportedToMs").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type UsageTracking = typeof usageTracking.$inferSelect;

// ─── Supplier Filters ───────────────────────────────────────────────────────

export const supplierFilters = pgTable("supplier_filters", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplierId").notNull(),
  materialTypeId: integer("materialTypeId"),
  minPrice: decimal("minPrice", { precision: 10, scale: 2 }),
  maxPrice: decimal("maxPrice", { precision: 10, scale: 2 }),
  minLeadDays: integer("minLeadDays"),
  maxLeadDays: integer("maxLeadDays"),
  serviceRadius: integer("serviceRadius"),
  acceptedLocations: text("acceptedLocations"),
  materialTypePreferences: json("materialTypePreferences").$type<string[]>(),
  minOrderQuantity: decimal("minOrderQuantity", { precision: 12, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SupplierFilter = typeof supplierFilters.$inferSelect;

// ─── RFQ Bids ───────────────────────────────────────────────────────────────

export const rfqBids = pgTable("rfq_bids", {
  id: serial("id").primaryKey(),
  rfqId: integer("rfqId").notNull(),
  supplierId: integer("supplierId").notNull(),
  status: rfqBidStatusEnum("status").default("submitted"),
  bidPrice: decimal("bidPrice", { precision: 12, scale: 2 }),
  leadDays: integer("leadDays"),
  notes: text("notes"),
  expiresAt: timestamp("expiresAt"),
  // ── Smart RFx structured response additions ──────────────────────────────────
  canFulfill: boolean("can_fulfill"),
  fieldValues: json("field_values"),
  gwpValue: decimal("gwp_value", { precision: 14, scale: 4 }),
  epdReference: text("epd_reference"),
  rfxTotalScore: decimal("rfx_total_score", { precision: 6, scale: 2 }),
  // ── Data quality (set server-side, never from client) ─────────────────────
  // L0 = proxy/none, L1 = self-reported, L2 = third-party, L3 = EPD verified
  dataQualityLevel: varchar("data_quality_level", { length: 2 }),
  // ── Compliance gate (computed server-side on bid submission) ──────────────
  // true  → gwpValue ≤ rfqs.gwpCapPerUnit (or no cap set)
  // false → gwpValue exceeds rfqs.gwpCapPerUnit
  // null  → no gwpValue provided or no cap on the parent RFQ
  gwpMeetsTarget: boolean("gwp_meets_target"),
  // Soft-delete — see retention policy note on rfqs table.
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type RfqBid = typeof rfqBids.$inferSelect;

// ─── RFQ Message Threads ────────────────────────────────────────────────────

export const rfqThreads = pgTable("rfq_threads", {
  id: serial("id").primaryKey(),
  rfqId: integer("rfqId").notNull(),
  supplierId: integer("supplierId").notNull(),
  buyerId: integer("buyerId").notNull(),
  status: rfqThreadStatusEnum("status").default("active"),
  lastMessageAt: timestamp("lastMessageAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type RfqThread = typeof rfqThreads.$inferSelect;

// ─── RFQ Messages ───────────────────────────────────────────────────────────

export const rfqMessages = pgTable("rfq_messages", {
  id: serial("id").primaryKey(),
  threadId: integer("threadId").notNull(),
  senderId: integer("senderId").notNull(),
  senderType: senderTypeEnum("senderType").notNull(),
  content: text("content").notNull(),
  isRead: boolean("isRead").default(false),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RfqMessage = typeof rfqMessages.$inferSelect;

// ─── Notifications ──────────────────────────────────────────────────────────

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  relatedRfqId: integer("relatedRfqId"),
  relatedThreadId: integer("relatedThreadId"),
  isRead: boolean("isRead").default(false),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;

// ─── RFQ Analytics ──────────────────────────────────────────────────────────

export const rfqAnalytics = pgTable("rfq_analytics", {
  id: serial("id").primaryKey(),
  rfqId: integer("rfqId").notNull(),
  totalBidsReceived: integer("totalBidsReceived").default(0),
  avgBidPrice: decimal("avgBidPrice", { precision: 12, scale: 2 }),
  lowestBidPrice: decimal("lowestBidPrice", { precision: 12, scale: 2 }),
  highestBidPrice: decimal("highestBidPrice", { precision: 12, scale: 2 }),
  avgResponseTimeHours: decimal("avgResponseTimeHours", { precision: 5, scale: 2 }),
  winningBidId: integer("winningBidId"),
  purchasedAt: timestamp("purchasedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type RfqAnalytic = typeof rfqAnalytics.$inferSelect;

// ─── Material Swaps ─────────────────────────────────────────────────────────

export const materialSwaps = pgTable("material_swaps", {
  id: serial("id").primaryKey(),
  materialId: integer("materialId").notNull(),
  swapMaterialId: integer("swapMaterialId").notNull(),
  swapReason: text("swapReason"),
  swapScore: integer("swapScore").notNull(),
  swapTier: swapTierEnum("swapTier").notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 2 }).notNull(),
  createdBy: createdByEnum("createdBy").notNull(),
  usageCount: integer("usageCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type MaterialSwap = typeof materialSwaps.$inferSelect;

// ─── Conversations ──────────────────────────────────────────────────────────

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  rfqId: integer("rfqId"),
  buyerId: integer("buyerId").notNull(),
  supplierId: integer("supplierId").notNull(),
  agentMode: agentModeEnum("agentMode").default("agent_first").notNull(),
  handoffStatus: handoffStatusEnum("handoffStatus").default("agent").notNull(),
  agentMessageCount: integer("agentMessageCount").default(0).notNull(),
  handoffRequestedAt: timestamp("handoffRequestedAt"),
  handoffReason: text("handoffReason"),
  lastMessage: text("lastMessage"),
  lastMessageAt: timestamp("lastMessageAt").defaultNow().notNull(),
  isPinned: boolean("isPinned").default(false).notNull(),
  isArchived: boolean("isArchived").default(false).notNull(),
  label: varchar("label", { length: 50 }),
  labelColor: varchar("labelColor", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

// ─── Messages ───────────────────────────────────────────────────────────────

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversationId").notNull(),
  senderId: integer("senderId").notNull(),
  senderType: messageSenderTypeEnum("senderType").default("user").notNull(),
  agentType: varchar("agentType", { length: 100 }),
  content: text("content").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  readAt: timestamp("readAt"),
  attachmentUrl: text("attachmentUrl"),
  attachmentType: varchar("attachmentType", { length: 50 }),
  attachmentName: varchar("attachmentName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// ─── Subscriptions (Microsoft AppSource) ────────────────────────────────────

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  microsoftSubscriptionId: varchar("microsoftSubscriptionId", { length: 255 }).notNull().unique(),
  tier: subscriptionTierEnum("tier").default("free").notNull(),
  status: subscriptionStatusEnum("status").default("active").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  lastRenewalDate: timestamp("lastRenewalDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

// ─── Video Calls ────────────────────────────────────────────────────────────

export const videoCalls = pgTable("video_calls", {
  id: serial("id").primaryKey(),
  callId: varchar("callId", { length: 255 }).notNull().unique(),
  callerId: integer("callerId").notNull(),
  calleeId: integer("calleeId").notNull(),
  conversationId: integer("conversationId").notNull(),
  status: videoCallStatusEnum("status").default("initiated").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
  durationSeconds: integer("durationSeconds"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VideoCall = typeof videoCalls.$inferSelect;
export type InsertVideoCall = typeof videoCalls.$inferInsert;

// ─── Agent Handoff Rules ────────────────────────────────────────────────────

export const agentHandoffRules = pgTable("agent_handoff_rules", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplierId").notNull().unique(),
  handoffMode: handoffModeEnum("handoffMode").default("hybrid").notNull(),
  maxAgentMessages: integer("maxAgentMessages").default(5).notNull(),
  businessHoursStart: varchar("businessHoursStart", { length: 5 }),
  businessHoursEnd: varchar("businessHoursEnd", { length: 5 }),
  businessDays: varchar("businessDays", { length: 50 }).default("Mon,Tue,Wed,Thu,Fri"),
  timezone: varchar("timezone", { length: 50 }).default("America/New_York"),
  customAgentPrompt: text("customAgentPrompt"),
  autoDeflectEnabled: boolean("autoDeflectEnabled").default(true).notNull(),
  totalConversations: integer("totalConversations").default(0).notNull(),
  agentResolutionRate: integer("agentResolutionRate").default(0).notNull(),
  avgMessagesBeforeHandoff: integer("avgMessagesBeforeHandoff").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type AgentHandoffRule = typeof agentHandoffRules.$inferSelect;
export type InsertAgentHandoffRule = typeof agentHandoffRules.$inferInsert;

// ─── Message Reactions ──────────────────────────────────────────────────────

export const messageReactions = pgTable("message_reactions", {
  id: serial("id").primaryKey(),
  messageId: integer("messageId").notNull(),
  userId: integer("userId").notNull(),
  reactionType: varchar("reactionType", { length: 20 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MessageReaction = typeof messageReactions.$inferSelect;
export type InsertMessageReaction = typeof messageReactions.$inferInsert;

// ─── Call History ───────────────────────────────────────────────────────────

export const callHistory = pgTable("call_history", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversationId").notNull(),
  callerId: integer("callerId").notNull(),
  receiverId: integer("receiverId").notNull(),
  callType: callTypeEnum("callType").notNull(),
  status: callStatusEnum("status").notNull(),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime"),
  durationSeconds: integer("durationSeconds").default(0),
  groupCallId: text("group_call_id"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CallHistory = typeof callHistory.$inferSelect;
export type InsertCallHistory = typeof callHistory.$inferInsert;

// ─── Monthly Call Usage ─────────────────────────────────────────────────────

export const monthlyCallUsage = pgTable("monthly_call_usage", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  month: varchar("month", { length: 7 }).notNull(),
  totalMinutes: integer("totalMinutes").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type MonthlyCallUsage = typeof monthlyCallUsage.$inferSelect;
export type InsertMonthlyCallUsage = typeof monthlyCallUsage.$inferInsert;

// ─── Legal Acceptances ──────────────────────────────────────────────────────

export const legalAcceptances = pgTable("legal_acceptances", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  termsAccepted: boolean("termsAccepted").default(false).notNull(),
  termsAcceptedAt: timestamp("termsAcceptedAt"),
  termsVersion: varchar("termsVersion", { length: 50 }).default("1.0"),
  privacyAccepted: boolean("privacyAccepted").default(false).notNull(),
  privacyAcceptedAt: timestamp("privacyAcceptedAt"),
  privacyVersion: varchar("privacyVersion", { length: 50 }).default("1.0"),
  cookieConsentGiven: boolean("cookieConsentGiven").default(false).notNull(),
  cookieConsentAt: timestamp("cookieConsentAt"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type LegalAcceptance = typeof legalAcceptances.$inferSelect;
export type InsertLegalAcceptance = typeof legalAcceptances.$inferInsert;

// ─── Location-Based Tables ──────────────────────────────────────────────────

export const suppliersLocation = pgTable(
  "suppliers_location",
  {
    id: serial("id").primaryKey(),
    supplierId: integer("supplier_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    state: varchar("state", { length: 2 }).notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    zipCode: varchar("zip_code", { length: 10 }).notNull(),
    latitude: decimal("latitude", { precision: 10, scale: 6 }).notNull(),
    longitude: decimal("longitude", { precision: 10, scale: 6 }).notNull(),
    materialsAvailable: json("materials_available").$type<string[]>().default([]),
    carbonScore: decimal("carbon_score", { precision: 5, scale: 2 }).default("0"),
    pricePerUnit: decimal("price_per_unit", { precision: 10, scale: 2 }),
    leadTimeDays: integer("lead_time_days").default(7),
    contactEmail: varchar("contact_email", { length: 255 }),
    contactPhone: varchar("contact_phone", { length: 20 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    stateIdx: index("idx_suppliers_location_state").on(table.state),
    cityIdx: index("idx_suppliers_location_city").on(table.city),
    latLngIdx: index("idx_suppliers_location_latlng").on(table.latitude, table.longitude),
  })
);

export type SuppliersLocation = typeof suppliersLocation.$inferSelect;
export type InsertSuppliersLocation = typeof suppliersLocation.$inferInsert;

export const complianceRules = pgTable(
  "compliance_rules",
  {
    id: serial("id").primaryKey(),
    state: varchar("state", { length: 2 }).notNull(),
    buildingCode: varchar("building_code", { length: 100 }).notNull(),
    ruleName: varchar("rule_name", { length: 255 }).notNull(),
    ruleDescription: text("rule_description"),
    appliesToMaterials: json("applies_to_materials").$type<string[]>().default([]),
    complianceType: varchar("compliance_type", { length: 50 }),
    complianceValue: varchar("compliance_value", { length: 100 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    stateIdx: index("idx_compliance_rules_state").on(table.state),
    codeIdx: index("idx_compliance_rules_code").on(table.buildingCode),
  })
);

export type ComplianceRules = typeof complianceRules.$inferSelect;
export type InsertComplianceRules = typeof complianceRules.$inferInsert;

export const regionalSwapPatterns = pgTable(
  "regional_swap_patterns",
  {
    id: serial("id").primaryKey(),
    state: varchar("state", { length: 2 }).notNull(),
    originalMaterial: varchar("original_material", { length: 255 }).notNull(),
    alternativeMaterial: varchar("alternative_material", { length: 255 }).notNull(),
    approvalRate: decimal("approval_rate", { precision: 5, scale: 2 }).default("0"),
    usageCount: integer("usage_count").default(0),
    avgCarbonReduction: decimal("avg_carbon_reduction", { precision: 5, scale: 2 }).default("0"),
    avgCostDelta: decimal("avg_cost_delta", { precision: 10, scale: 2 }).default("0"),
    avgPaybackYears: decimal("avg_payback_years", { precision: 5, scale: 2 }).default("0"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    stateIdx: index("idx_swap_patterns_state").on(table.state),
    materialIdx: index("idx_swap_patterns_material").on(table.originalMaterial),
  })
);

export type RegionalSwapPatterns = typeof regionalSwapPatterns.$inferSelect;
export type InsertRegionalSwapPatterns = typeof regionalSwapPatterns.$inferInsert;

export const shippingCosts = pgTable(
  "shipping_costs",
  {
    id: serial("id").primaryKey(),
    originState: varchar("origin_state", { length: 2 }).notNull(),
    destinationState: varchar("destination_state", { length: 2 }).notNull(),
    materialType: varchar("material_type", { length: 100 }).notNull(),
    costPerUnit: decimal("cost_per_unit", { precision: 10, scale: 2 }).notNull(),
    daysToDelivery: integer("days_to_delivery").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    routeIdx: index("idx_shipping_route").on(table.originState, table.destinationState),
    materialIdx: index("idx_shipping_material").on(table.materialType),
  })
);

export type ShippingCosts = typeof shippingCosts.$inferSelect;
export type InsertShippingCosts = typeof shippingCosts.$inferInsert;

export const climateZoneAdjustments = pgTable(
  "climate_zone_adjustments",
  {
    id: serial("id").primaryKey(),
    climateZone: varchar("climate_zone", { length: 10 }).notNull(),
    materialType: varchar("material_type", { length: 100 }).notNull(),
    durabilityMultiplier: decimal("durability_multiplier", { precision: 3, scale: 2 }).default("1.0"),
    rValueMultiplier: decimal("r_value_multiplier", { precision: 3, scale: 2 }).default("1.0"),
    carbonImpactMultiplier: decimal("carbon_impact_multiplier", { precision: 3, scale: 2 }).default("1.0"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    zoneIdx: index("idx_climate_zone").on(table.climateZone),
    materialIdx: index("idx_climate_material").on(table.materialType),
  })
);

export type ClimateZoneAdjustments = typeof climateZoneAdjustments.$inferSelect;
export type InsertClimateZoneAdjustments = typeof climateZoneAdjustments.$inferInsert;

export const locationPricingAdjustments = pgTable(
  "location_pricing_adjustments",
  {
    id: serial("id").primaryKey(),
    state: varchar("state", { length: 2 }).notNull(),
    materialType: varchar("material_type", { length: 100 }).notNull(),
    priceMultiplier: decimal("price_multiplier", { precision: 3, scale: 2 }).default("1.0"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    stateIdx: index("idx_loc_pricing_state").on(table.state),
    materialIdx: index("idx_loc_pricing_material").on(table.materialType),
  })
);

export type LocationPricingAdjustmentss = typeof locationPricingAdjustments.$inferSelect;
export type InsertLocationPricingAdjustments = typeof locationPricingAdjustments.$inferInsert;

// ─── Swap Engine: Functional Equivalence Validation ────────────────────────

export const materialTechnicalSpecs = pgTable(
  "material_technical_specs",
  {
    id: serial("id").primaryKey(),
    materialId: integer("material_id").notNull(),
    astmCodes: json("astm_codes").$type<string[]>().default([]),
    ulListing: varchar("ul_listing", { length: 255 }),
    ulDesignNumber: varchar("ul_design_number", { length: 50 }),
    iccEsReport: varchar("icc_es_report", { length: 50 }),
    fireRating: varchar("fire_rating", { length: 50 }),
    fireRatingStandard: varchar("fire_rating_standard", { length: 100 }),
    charRate: varchar("char_rate", { length: 50 }),
    compressiveStrengthPsi: integer("compressive_strength_psi"),
    modulusOfElasticityKsi: integer("modulus_of_elasticity_ksi"),
    flexuralStrengthPsi: integer("flexural_strength_psi"),
    tensileStrengthPsi: integer("tensile_strength_psi"),
    stiffnessKsi: integer("stiffness_ksi"),
    rValuePerInch: decimal("r_value_per_inch", { precision: 5, scale: 2 }),
    lttr15Year: decimal("lttr_15_year", { precision: 5, scale: 2 }),
    permRating: decimal("perm_rating", { precision: 5, scale: 2 }),
    thermalUValue: decimal("thermal_u_value", { precision: 8, scale: 4 }),
    stcRating: integer("stc_rating"),
    iicRating: integer("iic_rating"),
    nrcRating: decimal("nrc_rating", { precision: 3, scale: 2 }),
    laborUnits: decimal("labor_units", { precision: 5, scale: 2 }),
    cureTimeHours: integer("cure_time_hours"),
    weightPerUnit: decimal("weight_per_unit", { precision: 8, scale: 2 }),
    slumpWorkability: varchar("slump_workability", { length: 50 }),
    installationDifficulty: integer("installation_difficulty"),
    leadTimeDays: integer("lead_time_days"),
    otifPercentage: decimal("otif_percentage", { precision: 5, scale: 2 }),
    supplierZScore: decimal("supplier_z_score", { precision: 5, scale: 2 }),
    warrantyYears: integer("warranty_years"),
    maintenanceCycleYears: integer("maintenance_cycle_years"),
    expectedLifespanYears: integer("expected_lifespan_years"),
    dataSource: varchar("data_source", { length: 100 }),
    dataConfidence: integer("data_confidence").default(50),
    lastVerifiedAt: timestamp("last_verified_at"),
    verifiedBy: integer("verified_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    materialIdx: index("idx_tech_specs_material").on(table.materialId),
    ulListingIdx: index("idx_tech_specs_ul").on(table.ulListing),
    iccEsIdx: index("idx_tech_specs_icc_es").on(table.iccEsReport),
  })
);

export type MaterialTechnicalSpec = typeof materialTechnicalSpecs.$inferSelect;
export type InsertMaterialTechnicalSpec = typeof materialTechnicalSpecs.$inferInsert;

export const pricingData = pgTable(
  "pricing_data",
  {
    id: serial("id").primaryKey(),
    materialId: integer("material_id").notNull(),
    pricePerUnit: decimal("price_per_unit", { precision: 10, scale: 2 }).notNull(),
    unit: varchar("unit", { length: 50 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("USD"),
    state: varchar("state", { length: 2 }),
    city: varchar("city", { length: 100 }),
    zipCode: varchar("zip_code", { length: 10 }),
    county: varchar("county", { length: 100 }),
    source: varchar("source", { length: 50 }).notNull(),
    sourceDate: timestamp("source_date"),
    sourceUrl: text("source_url"),
    projectName: varchar("project_name", { length: 255 }),
    contractNumber: varchar("contract_number", { length: 100 }),
    laborRatePerHour: decimal("labor_rate_per_hour", { precision: 8, scale: 2 }),
    totalLaborCost: decimal("total_labor_cost", { precision: 10, scale: 2 }),
    dataConfidence: integer("data_confidence").default(50),
    isActive: boolean("is_active").default(true),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    materialIdx: index("idx_pricing_material").on(table.materialId),
    stateIdx: index("idx_pricing_state_data").on(table.state),
    sourceIdx: index("idx_pricing_source").on(table.source),
    activeIdx: index("idx_pricing_active").on(table.isActive),
  })
);

export type PricingData = typeof pricingData.$inferSelect;
export type InsertPricingData = typeof pricingData.$inferInsert;

export const swapValidations = pgTable(
  "swap_validations",
  {
    id: serial("id").primaryKey(),
    incumbentMaterialId: integer("incumbent_material_id").notNull(),
    sustainableMaterialId: integer("sustainable_material_id").notNull(),
    projectId: integer("project_id"),
    validationStatus: swapValidationStatusEnum("validation_status").notNull(),
    overallScore: decimal("overall_score", { precision: 5, scale: 2 }).notNull(),
    showstopperResults: json("showstopper_results").notNull(),
    passedChecks: integer("passed_checks").notNull(),
    failedChecks: integer("failed_checks").notNull(),
    skippedChecks: integer("skipped_checks").notNull(),
    recommendation: text("recommendation").notNull(),
    incumbentTotalCost: decimal("incumbent_total_cost", { precision: 10, scale: 2 }),
    sustainableTotalCost: decimal("sustainable_total_cost", { precision: 10, scale: 2 }),
    costDeltaPercentage: decimal("cost_delta_percentage", { precision: 5, scale: 2 }),
    incumbentGwp: decimal("incumbent_gwp", { precision: 10, scale: 2 }),
    sustainableGwp: decimal("sustainable_gwp", { precision: 10, scale: 2 }),
    carbonReductionPercentage: decimal("carbon_reduction_percentage", { precision: 5, scale: 2 }),
    csiFormUrl: text("csi_form_url"),
    csiFormGeneratedAt: timestamp("csi_form_generated_at"),
    validatedAt: timestamp("validated_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at"),
    requestedBy: integer("requested_by"),
    rfqId: integer("rfq_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

export const submittals = pgTable(
  "submittals",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id"),
    specSection: varchar("spec_section", { length: 50 }),
    masterformatCode: varchar("masterformat_code", { length: 20 }),
    submittalNumber: varchar("submittal_number", { length: 100 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    status: submittalStatusEnum("status").notNull().default("draft"),
    ballInCourt: submittalBallInCourtEnum("ball_in_court").notNull().default("buyer"),
    submittedAt: timestamp("submitted_at"),
    dueAt: timestamp("due_at"),
    requiredOnSiteAt: timestamp("required_on_site_at"),
    returnedAt: timestamp("returned_at"),
    relatedRfqId: integer("related_rfq_id").references(() => rfqs.id, { onDelete: "set null" }),
    relatedSwapValidationId: integer("related_swap_validation_id").references(() => swapValidations.id, { onDelete: "set null" }),
    createdBy: integer("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    createdByIdx: index("idx_submittals_created_by").on(table.createdBy),
    projectIdx: index("idx_submittals_project").on(table.projectId),
    statusIdx: index("idx_submittals_status").on(table.status),
    relatedRfqIdx: index("idx_submittals_related_rfq").on(table.relatedRfqId),
    relatedValidationIdx: index("idx_submittals_related_validation").on(table.relatedSwapValidationId),
  })
);

export type Submittal = typeof submittals.$inferSelect;
export type InsertSubmittal = typeof submittals.$inferInsert;

export const submittalItems = pgTable(
  "submittal_items",
  {
    id: serial("id").primaryKey(),
    submittalId: integer("submittal_id").notNull().references(() => submittals.id, { onDelete: "cascade" }),
    materialId: integer("material_id").references(() => materials.id, { onDelete: "set null" }),
    supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    submittalIdx: index("idx_submittal_items_submittal").on(table.submittalId),
    materialIdx: index("idx_submittal_items_material").on(table.materialId),
    supplierIdx: index("idx_submittal_items_supplier").on(table.supplierId),
  })
);

export type SubmittalItem = typeof submittalItems.$inferSelect;
export type InsertSubmittalItem = typeof submittalItems.$inferInsert;

export const caDocuments = pgTable(
  "ca_documents",
  {
    id: serial("id").primaryKey(),
    type: caDocumentTypeEnum("type").notNull(),
    status: caDocumentStatusEnum("status").notNull().default("draft"),
    ballInCourt: submittalBallInCourtEnum("ball_in_court").notNull().default("buyer"),
    documentNumber: varchar("document_number", { length: 100 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    projectId: integer("project_id"),
    submittalId: integer("submittal_id").references(() => submittals.id, { onDelete: "set null" }),
    relatedRfqId: integer("related_rfq_id").references(() => rfqs.id, { onDelete: "set null" }),
    relatedSwapValidationId: integer("related_swap_validation_id").references(() => swapValidations.id, { onDelete: "set null" }),
    // RFI-specific fields
    question: text("question"),
    officialResponse: text("official_response"),
    responseAt: timestamp("response_at"),
    // Change-request specific fields
    proposedResolution: text("proposed_resolution"),
    costImpact: decimal("cost_impact", { precision: 12, scale: 2 }),
    scheduleImpactDays: integer("schedule_impact_days"),
    approvedAt: timestamp("approved_at"),
    closedAt: timestamp("closed_at"),
    dueAt: timestamp("due_at"),
    createdBy: integer("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    typeIdx: index("idx_ca_documents_type").on(table.type),
    statusIdx: index("idx_ca_documents_status").on(table.status),
    createdByIdx: index("idx_ca_documents_created_by").on(table.createdBy),
    submittalIdx: index("idx_ca_documents_submittal").on(table.submittalId),
    rfqIdx: index("idx_ca_documents_related_rfq").on(table.relatedRfqId),
  }),
);

export type CaDocument = typeof caDocuments.$inferSelect;
export type InsertCaDocument = typeof caDocuments.$inferInsert;

export const caDocumentMessages = pgTable(
  "ca_document_messages",
  {
    id: serial("id").primaryKey(),
    documentId: integer("document_id")
      .notNull()
      .references(() => caDocuments.id, { onDelete: "cascade" }),
    authorUserId: integer("author_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    documentIdx: index("idx_ca_document_messages_document").on(table.documentId),
    authorIdx: index("idx_ca_document_messages_author").on(table.authorUserId),
  }),
);

export type CaDocumentMessage = typeof caDocumentMessages.$inferSelect;
export type InsertCaDocumentMessage = typeof caDocumentMessages.$inferInsert;

export const materialAssemblySpecs = pgTable(
  "material_assembly_specs",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    description: text("description"),
    totalThicknessInches: decimal("total_thickness_inches", { precision: 5, scale: 2 }),
    totalRValue: decimal("total_r_value", { precision: 5, scale: 2 }),
    fireRating: varchar("fire_rating", { length: 50 }),
    ulDesignNumber: varchar("ul_design_number", { length: 50 }),
    stcRating: integer("stc_rating"),
    iicRating: integer("iic_rating"),
    totalCostPerSf: decimal("total_cost_per_sf", { precision: 10, scale: 2 }),
    totalGwpPerSf: decimal("total_gwp_per_sf", { precision: 10, scale: 2 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    epdNumber: varchar("epd_number", { length: 100 }),
    gwpA1A3: decimal("gwp_a1_a3", { precision: 10, scale: 4 }),
    gwpDeclaredUnit: varchar("gwp_declared_unit", { length: 50 }),
    gwpPer1000sf: decimal("gwp_per_1000sf", { precision: 10, scale: 2 }),
    gwpMsfFactor: decimal("gwp_msf_factor", { precision: 10, scale: 4 }),
    carbonTier: varchar("carbon_tier", { length: 20 }),
    assemblyTypeTags: text("assembly_type_tags").array(),
    framingTypeTags: text("framing_type_tags").array(),
    exteriorFinishTags: text("exterior_finish_tags").array(),
    certificationTags: text("certification_tags").array(),
  },
  (table) => ({
    categoryIdx: index("idx_assembly_specs_category").on(table.category),
    ulDesignIdx: index("idx_assembly_specs_ul").on(table.ulDesignNumber),
    // Restored: indexes dropped in prior push
    epdNumberIdx: index("idx_assembly_epd_number").on(table.epdNumber),
    carbonTierIdx: index("idx_assembly_carbon_tier").on(table.carbonTier),
    assemblyTypeTagsIdx: index("idx_assembly_type_tags").on(table.assemblyTypeTags),
    nameUnique: uniqueIndex("idx_assembly_specs_name_unique").on(table.name),
  })
);

export type MaterialAssemblySpec = typeof materialAssemblySpecs.$inferSelect;
export type InsertMaterialAssemblySpec = typeof materialAssemblySpecs.$inferInsert;

export const assemblySpecComponents = pgTable(
  "assembly_spec_components",
  {
    id: serial("id").primaryKey(),
    assemblySpecId: integer("assembly_spec_id").notNull(),
    materialId: integer("material_id").notNull(),
    layerOrder: integer("layer_order").notNull(),
    layerName: varchar("layer_name", { length: 255 }).notNull(),
    quantity: decimal("quantity", { precision: 8, scale: 2 }).notNull(),
    unit: varchar("unit", { length: 50 }).notNull(),
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

// ─── EWS Assembly Carbon Components (detailed per-layer carbon data) ─────────
// Each row = one material layer within a wall assembly (e.g. GWB, studs, insulation, cladding)
// Parent: materialAssemblySpecs.id

export const ewsCarbonComponents = pgTable(
  "ews_carbon_components",
  {
    id: serial("id").primaryKey(),
    assemblySpecId: integer("assembly_spec_id").notNull(),
    // Interior/Exterior/Core classification
    zone: varchar("zone", { length: 20 }).notNull(), // "INTERIOR", "CORE", "EXTERIOR"
    layerOrder: integer("layer_order").notNull(),
    layerName: varchar("layer_name", { length: 255 }).notNull(), // e.g. "Interior GWB (5/8\")"
    // For assemblies with multiple framing options (1=CFMF, 2=HSS, 3=Unitized)
    framingOption: integer("framing_option"), // null = shared across all options
    // Manufacturer + product
    manufacturer: varchar("manufacturer", { length: 255 }),
    productName: varchar("product_name", { length: 255 }),
    epdNumber: varchar("epd_number", { length: 100 }),
    // Dimensions
    dimensionParam: varchar("dimension_param", { length: 100 }), // e.g. "5/8\"", "4\"", "2\""
    // GWP data from EPD
    gwpValue: decimal("gwp_value", { precision: 12, scale: 4 }),
    gwpUnits: varchar("gwp_units", { length: 50 }), // e.g. "kgCO2e/m2", "kgCO2e/kg"
    declaredUnit: varchar("declared_unit", { length: 50 }), // e.g. "1 square meter", "1 metric ton"
    msfFactor: decimal("msf_factor", { precision: 12, scale: 4 }), // conversion to 1000 SF
    // Computed: embodied carbon per 1000 SF facade
    carbonPer1000sf: decimal("carbon_per_1000sf", { precision: 12, scale: 2 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    assemblyIdx: index("idx_ews_carbon_comp_assembly").on(table.assemblySpecId),
    zoneIdx: index("idx_ews_carbon_comp_zone").on(table.zone),
  })
);

export type EwsCarbonComponent = typeof ewsCarbonComponents.$inferSelect;
export type InsertEwsCarbonComponent = typeof ewsCarbonComponents.$inferInsert;

// ─── Scraped Suppliers ──────────────────────────────────────────────────────

export const scrapedSuppliers = pgTable("scraped_suppliers", {
  id: serial("id").primaryKey(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  website: text("website"),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zip_code", { length: 10 }),
  materialTypes: json("material_types").$type<string[]>().default([]),
  source: varchar("source", { length: 100 }),
  outreachSentAt: timestamp("outreach_sent_at"),
  outreachRfqId: integer("outreach_rfq_id"),
  emailStatus: varchar("email_status", { length: 50 }),
  emailOpens: integer("email_opens").default(0),
  emailClicks: integer("email_clicks").default(0),
  emailBouncedAt: timestamp("email_bounced_at"),
  lastEngagedAt: timestamp("last_engaged_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ScrapedSupplier = typeof scrapedSuppliers.$inferSelect;
export type InsertScrapedSupplier = typeof scrapedSuppliers.$inferInsert;

// ─── Scraped Leads (Decision Makers) ─────────────────────────────────────────
// Architects, GCs, sustainability directors, procurement managers discovered
// via Bing Search and Azure Maps — buyer-side lead pipeline.

export const scrapedLeads = pgTable("scraped_leads", {
  id: serial("id").primaryKey(),
  fullName: varchar("full_name", { length: 255 }),
  title: varchar("title", { length: 255 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  company: varchar("company", { length: 255 }).notNull(),
  website: text("website"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  // 'architect' | 'general_contractor' | 'sustainability_director' | 'procurement'
  role: varchar("role", { length: 50 }).notNull(),
  source: varchar("source", { length: 100 }).notNull(),
  linkedinUrl: text("linkedin_url"),
  outreachSentAt: timestamp("outreach_sent_at"),
  emailStatus: varchar("email_status", { length: 50 }).default("pending"),
  emailOpens: integer("email_opens").default(0),
  emailClicks: integer("email_clicks").default(0),
  emailBouncedAt: timestamp("email_bounced_at"),
  lastEngagedAt: timestamp("last_engaged_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ScrapedLead = typeof scrapedLeads.$inferSelect;
export type InsertScrapedLead = typeof scrapedLeads.$inferInsert;

// ─── RFQ Drafts (Human-in-the-Loop review) ───────────────────────────────────
// AI proposes → human reviews → system executes.
// A draft holds the AI's raw output and the human's final approved version.
// No rfq_request row is created until the draft reaches "approved" status.

export const rfqDraftStatusEnum = pgEnum("rfq_draft_status", [
  "draft",      // AI produced this, awaiting human review
  "approved",   // Human approved (possibly with edits) — rfq_requests created
  "rejected",   // Human rejected — no rfq_requests created
]);

export const rfqDrafts = pgTable("rfq_drafts", {
  id: serial("id").primaryKey(),
  architectId: integer("architect_id").notNull(),

  // Raw text the architect typed into the intake box
  rawInput: text("raw_input").notNull(),

  // Full SwapResult JSON from swapEngine (AI output, immutable after creation)
  aiOutput: json("ai_output").notNull(),

  // Human-edited version of the RFQ fields (starts as a copy of aiOutput, mutated on edit)
  humanEdits: json("human_edits"),

  // Which AI-inferred fields the human explicitly accepted vs. changed
  // e.g. { "category": "accepted", "quantity": "edited", "certifications": "rejected" }
  fieldDecisions: json("field_decisions"),

  // Reason provided when a field or the whole draft is rejected
  rejectionReason: text("rejection_reason"),

  status: rfqDraftStatusEnum("status").default("draft").notNull(),

  // Set when the human approves — links back to the created rfq_requests rows
  approvedAt: timestamp("approved_at"),
  approvedByUserId: integer("approved_by_user_id"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type RfqDraft = typeof rfqDrafts.$inferSelect;
export type InsertRfqDraft = typeof rfqDrafts.$inferInsert;

// ─── RFQ Requests ────────────────────────────────────────────────────────────
// Simpler direct-assignment model: one architect → one supplier per request.
// Complements the existing rfqs/rfq_bids wave-matching tables.
// A request is only created after the architect approves a draft.

export const rfqRequestStatusEnum = pgEnum("rfq_request_status", [
  "pending",
  "accepted",
  "declined",
  "fulfilled",
]);

export const rfqRequests = pgTable("rfq_requests", {
  id: serial("id").primaryKey(),
  architectId: integer("architect_id").notNull(),
  supplierId: integer("supplier_id").notNull(),
  materialId: integer("material_id"),
  materialType: varchar("material_type", { length: 255 }).notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),
  specs: text("specs"),
  message: text("message"),
  status: rfqRequestStatusEnum("status").default("pending").notNull(),
  // FK to the draft that produced this request (for audit trail)
  draftId: integer("draft_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type RfqRequest = typeof rfqRequests.$inferSelect;
export type InsertRfqRequest = typeof rfqRequests.$inferInsert;

// ─── Referrals ────────────────────────────────────────────────────────────────
// General-purpose referral tracking (simpler than architect_referrals).

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull(),
  referredEmail: varchar("referred_email", { length: 320 }).notNull(),
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;

// ─── Email Suppression List ─────────────────────────────────────────────────

export const emailSuppressionList = pgTable("email_suppression_list", {
  email: varchar("email", { length: 255 }).primaryKey(),
  reason: varchar("reason", { length: 100 }),
  suppressedAt: timestamp("suppressed_at").defaultNow().notNull(),
  permanent: boolean("permanent").default(false).notNull(),
});

export type EmailSuppression = typeof emailSuppressionList.$inferSelect;
export type InsertEmailSuppression = typeof emailSuppressionList.$inferInsert;

// ─── Email Credentials (managed by email-auth.ts, schema kept here for drizzle-kit sync) ──
export const emailCredentials = pgTable("email_credentials", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  salt: bytea("salt").notNull(),
  hash: bytea("hash").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailCredential = typeof emailCredentials.$inferSelect;

// ─── User Engagement (Insider streak/credit system) ────────────────────────

export const userEngagement = pgTable("user_engagement", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  credits: integer("credits").default(0).notNull(),
  currentStreak: integer("currentStreak").default(0).notNull(),
  longestStreak: integer("longestStreak").default(0).notNull(),
  lastCheckIn: timestamp("lastCheckIn"),
  totalCheckIns: integer("totalCheckIns").default(0).notNull(),
  tier: varchar("tier", { length: 20 }).default("explorer").notNull(),
  rfqsSubmitted: integer("rfqsSubmitted").default(0).notNull(),
  referrals: integer("referrals").default(0).notNull(),
  comparisons: integer("comparisons").default(0).notNull(),
  specSheetsGenerated: integer("specSheetsGenerated").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type UserEngagement = typeof userEngagement.$inferSelect;

export const engagementLog = pgTable("engagement_log", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  creditsEarned: integer("creditsEarned").default(0).notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EngagementLog = typeof engagementLog.$inferSelect;

// ─── EPD Materials ──────────────────────────────────────────────────────────

export const epdMaterials = pgTable(
  "epd_materials",
  {
    id: serial("id").primaryKey(),
    supplierId: integer("supplier_id").notNull(),
    manufacturerName: varchar("manufacturer_name", { length: 255 }),
    productName: varchar("product_name", { length: 255 }).notNull(),
    epdNumber: varchar("epd_number", { length: 100 }),
    assemblyType: varchar("assembly_type", { length: 50 }),
    coreOption: integer("core_option"),
    gwpRaw: decimal("gwp_raw", { precision: 14, scale: 4 }),
    gwpUnit: varchar("gwp_unit", { length: 50 }),
    gwpPer1000sf: decimal("gwp_per_1000sf", { precision: 14, scale: 4 }),
    declaredUnit: varchar("declared_unit", { length: 100 }),
    dimensionParam: varchar("dimension_param", { length: 100 }),
    notes: text("notes"),
    // ── Extended spec columns (migration 0030) ──────────────────────────
    epdExpiry: date("epd_expiry"),
    epdProgramOperator: varchar("epd_program_operator", { length: 100 }),
    interiorExterior: varchar("interior_exterior", { length: 20 }),
    rValue: decimal("r_value", { precision: 6, scale: 2 }),
    fireRating: varchar("fire_rating", { length: 50 }),
    astmStandards: json("astm_standards").$type<string[]>(),
    msfFactor: decimal("msf_factor", { precision: 10, scale: 4 }),
    title24Compliant: boolean("title24_compliant").default(false),
    ieccCompliant: boolean("iecc_compliant").default(false),
    vocCompliant: boolean("voc_compliant").default(false),
    notOnRedList: boolean("not_on_red_list").default(false),
    hpdAvailable: boolean("hpd_available").default(false),
    c2cCertified: boolean("c2c_certified").default(false),
    fscCertified: boolean("fsc_certified").default(false),
    greenguardGold: boolean("greenguard_gold").default(false),
    declareLabel: boolean("declare_label").default(false),
    recycledContentPct: decimal("recycled_content_pct", { precision: 5, scale: 2 }),
    regionalAvailability: json("regional_availability").$type<string[]>(),
    regionalWithin500mi: boolean("regional_within_500mi").default(false),
    leadTimeDays: integer("lead_time_days"),
    pricePerUnit: decimal("price_per_unit", { precision: 12, scale: 4 }),
    priceUnit: varchar("price_unit", { length: 30 }),
    takeBackProgram: boolean("take_back_program").default(false),
    minOrderQuantity: integer("min_order_quantity"),
    leedCredits: json("leed_credits").$type<Record<string, number>>(),
    hardnessMohs: decimal("hardness_mohs", { precision: 4, scale: 1 }),
    installabilityHrsSf: decimal("installability_hrs_sf", { precision: 6, scale: 3 }),
    lifespanYears: integer("lifespan_years"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    supplierIdx: index("idx_epd_materials_supplier").on(table.supplierId),
    assemblyIdx: index("idx_epd_materials_assembly").on(table.assemblyType),
  })
);

export type EpdMaterial = typeof epdMaterials.$inferSelect;
export type InsertEpdMaterial = typeof epdMaterials.$inferInsert;

// ─── Material Credit Score Cache ─────────────────────────────────────────────

export const materialCreditScoreCache = pgTable("material_credit_score_cache", {
  epdId: integer("epdId").primaryKey(),
  total: integer("total").notNull(),
  carbonEfficiency: integer("carbonEfficiency").notNull(),
  epdVerification: integer("epdVerification").notNull(),
  manufacturerTransparency: integer("manufacturerTransparency").notNull(),
  assemblyOptionsCoverage: integer("assemblyOptionsCoverage").notNull(),
  rulesVersion: varchar("rulesVersion", { length: 32 }).notNull().default("ccps-policy-v1"),
  inputFingerprint: varchar("inputFingerprint", { length: 64 }).notNull().default(""),
  epdValidityStatus: varchar("epdValidityStatus", { length: 20 }).notNull().default("missing"),
  staleReason: varchar("staleReason", { length: 64 }),
  expiresAt: timestamp("expiresAt").notNull().defaultNow(),
  computedAt: timestamp("computedAt").defaultNow().notNull(),
});

export type MaterialCreditScoreCache = typeof materialCreditScoreCache.$inferSelect;

export const materialCreditScoreSnapshots = pgTable("material_credit_score_snapshots", {
  id: serial("id").primaryKey(),
  epdId: integer("epdId").notNull(),
  total: integer("total").notNull(),
  carbonEfficiency: integer("carbonEfficiency").notNull(),
  epdVerification: integer("epdVerification").notNull(),
  manufacturerTransparency: integer("manufacturerTransparency").notNull(),
  assemblyOptionsCoverage: integer("assemblyOptionsCoverage").notNull(),
  rulesVersion: varchar("rulesVersion", { length: 32 }).notNull(),
  inputFingerprint: varchar("inputFingerprint", { length: 64 }).notNull(),
  epdValidityStatus: varchar("epdValidityStatus", { length: 20 }).notNull(),
  staleReason: varchar("staleReason", { length: 64 }),
  inputs: json("inputs").$type<Record<string, unknown>>(),
  expiresAt: timestamp("expiresAt").notNull(),
  computedAt: timestamp("computedAt").defaultNow().notNull(),
}, (table) => ({
  epdComputedIdx: index("idx_material_credit_score_snapshots_epd_computed").on(
    table.epdId,
    table.computedAt
  ),
}));

export type MaterialCreditScoreSnapshot = typeof materialCreditScoreSnapshots.$inferSelect;

// ─── CRM Enums ───────────────────────────────────────────────────────────────

export const crmContactTypeEnum = pgEnum("crm_contact_type", [
  "supplier", "architect_firm", "architect",
]);
export const crmStageEnum = pgEnum("crm_stage", [
  "prospect", "contacted", "engaged", "claimed", "trial", "paying", "churned", "dead",
]);
export const crmEventTypeEnum = pgEnum("crm_event_type", [
  "email_sent", "email_opened", "email_clicked", "replied",
  "profile_claimed", "demo_booked", "converted_trial", "converted_paying",
  "note_added", "status_changed", "profile_viewed",
]);

// ─── CRM Contacts ─────────────────────────────────────────────────────────────

export const crmContacts = pgTable(
  "crm_contacts",
  {
    id: serial("id").primaryKey(),
    type: crmContactTypeEnum("type").notNull().default("supplier"),
    companyName: varchar("company_name", { length: 255 }).notNull(),
    contactName: varchar("contact_name", { length: 255 }),
    email: varchar("email", { length: 320 }),
    website: varchar("website", { length: 500 }),
    location: varchar("location", { length: 255 }),
    category: varchar("category", { length: 100 }),
    subcategory: varchar("subcategory", { length: 100 }),
    keyProduct: text("key_product"),
    pitchAngle: text("pitch_angle"),
    hasEpd: boolean("has_epd").default(false),
    readinessLevel: varchar("readiness_level", { length: 20 }), // high / medium / low
    stage: crmStageEnum("stage").notNull().default("prospect"),
    internalNotes: text("internal_notes"),
    source: varchar("source", { length: 100 }),
    linkedinUrl: varchar("linkedin_url", { length: 500 }),
    supplierId: integer("supplier_id"), // populated when they claim profile
    lastContactedAt: timestamp("last_contacted_at"),
    nextFollowUpAt: timestamp("next_follow_up_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    companyIdx: index("idx_crm_contacts_company").on(t.companyName),
    stageIdx: index("idx_crm_contacts_stage").on(t.stage),
    categoryIdx: index("idx_crm_contacts_category").on(t.category),
    emailIdx: index("idx_crm_contacts_email").on(t.email),
  })
);

export type CrmContact = typeof crmContacts.$inferSelect;
export type InsertCrmContact = typeof crmContacts.$inferInsert;

// ─── CRM Events (activity log) ────────────────────────────────────────────────

export const crmEvents = pgTable(
  "crm_events",
  {
    id: serial("id").primaryKey(),
    contactId: integer("contact_id").notNull(),
    eventType: crmEventTypeEnum("event_type").notNull(),
    subject: varchar("subject", { length: 500 }),
    body: text("body"),
    notes: text("notes"),
    performedBy: varchar("performed_by", { length: 100 }).default("system"),
    metadata: json("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    contactIdx: index("idx_crm_events_contact").on(t.contactId),
    typeIdx: index("idx_crm_events_type").on(t.eventType),
    createdIdx: index("idx_crm_events_created").on(t.createdAt),
  })
);

export type CrmEvent = typeof crmEvents.$inferSelect;
export type InsertCrmEvent = typeof crmEvents.$inferInsert;

// ─── CRM Email Sequences ──────────────────────────────────────────────────────

export const crmEmailSequences = pgTable(
  "crm_email_sequences",
  {
    id: serial("id").primaryKey(),
    contactId: integer("contact_id").notNull(),
    sequenceName: varchar("sequence_name", { length: 100 }).notNull(),
    step: integer("step").notNull().default(1),
    scheduledAt: timestamp("scheduled_at"),
    sentAt: timestamp("sent_at"),
    openedAt: timestamp("opened_at"),
    clickedAt: timestamp("clicked_at"),
    repliedAt: timestamp("replied_at"),
    bouncedAt: timestamp("bounced_at"),
    unsubscribedAt: timestamp("unsubscribed_at"),
    resendMessageId: varchar("resend_message_id", { length: 255 }),
    status: varchar("status", { length: 50 }).default("pending").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    contactStepIdx: index("idx_crm_seq_contact_step").on(t.contactId, t.step),
    statusIdx: index("idx_crm_seq_status").on(t.status),
    scheduledIdx: index("idx_crm_seq_scheduled").on(t.scheduledAt),
  })
);

export type CrmEmailSequence = typeof crmEmailSequences.$inferSelect;
export type InsertCrmEmailSequence = typeof crmEmailSequences.$inferInsert;

// ─── Price Indices (BLS/FRED) ─────────────────────────────────────────────────

export const priceIndices = pgTable(
  "price_indices",
  {
    id: serial("id").primaryKey(),
    category: varchar("category", { length: 100 }).notNull(),
    seriesId: varchar("series_id", { length: 50 }).notNull(),
    seriesName: varchar("series_name", { length: 255 }),
    period: varchar("period", { length: 10 }).notNull(), // "2025-11"
    value: decimal("value", { precision: 14, scale: 4 }).notNull(),
    yoyChangePct: decimal("yoy_change_pct", { precision: 8, scale: 4 }), // % vs same period last year
    source: varchar("source", { length: 50 }).default("FRED").notNull(),
    scrapedAt: timestamp("scraped_at").defaultNow().notNull(),
  },
  (t) => ({
    seriesPeriodIdx: uniqueIndex("idx_price_series_period").on(t.seriesId, t.period),
    categoryIdx: index("idx_price_category").on(t.category),
  })
);

export type PriceIndex = typeof priceIndices.$inferSelect;
export type InsertPriceIndex = typeof priceIndices.$inferInsert;

// ─── Lead Time Catalog ────────────────────────────────────────────────────────

export const leadTimeCatalog = pgTable(
  "lead_time_catalog",
  {
    id: serial("id").primaryKey(),
    category: varchar("category", { length: 100 }).notNull(),
    subcategory: varchar("subcategory", { length: 100 }),
    product: varchar("product", { length: 255 }),
    weeksMin: integer("weeks_min").notNull(),
    weeksMax: integer("weeks_max").notNull(),
    notes: text("notes"),
    source: varchar("source", { length: 255 }),
    asOf: timestamp("as_of").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    categoryIdx: index("idx_lead_time_category").on(t.category),
  })
);

export type LeadTimeCatalog = typeof leadTimeCatalog.$inferSelect;
export type InsertLeadTimeCatalog = typeof leadTimeCatalog.$inferInsert;

// ─── Scraper Run Log ──────────────────────────────────────────────────────────

export const scraperRuns = pgTable(
  "scraper_runs",
  {
    id: serial("id").primaryKey(),
    scraperName: varchar("scraper_name", { length: 100 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("running"), // running | success | error
    recordsProcessed: integer("records_processed").default(0),
    recordsCreated: integer("records_created").default(0),
    recordsUpdated: integer("records_updated").default(0),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    durationMs: integer("duration_ms"),
    metadata: json("metadata"),
  },
  (t) => ({
    nameIdx: index("idx_scraper_runs_name").on(t.scraperName),
    statusIdx: index("idx_scraper_runs_status").on(t.status),
    startedIdx: index("idx_scraper_runs_started").on(t.startedAt),
  })
);

export type ScraperRun = typeof scraperRuns.$inferSelect;
export type InsertScraperRun = typeof scraperRuns.$inferInsert;

// ─── Concierge Routes ─────────────────────────────────────────────────────────

/**
 * Tracks every warm-intro email Jerit sends via the admin concierge panel.
 * One row per send: architect × supplier × project.
 */
export const conciergeRoutes = pgTable(
  "concierge_routes",
  {
    id: serial("id").primaryKey(),
    rfqId: integer("rfq_id").references(() => rfqs.id, { onDelete: "set null" }),
    projectName: text("project_name").notNull(),
    projectLocation: text("project_location"),
    materialTypes: json("material_types").$type<string[]>().notNull().default([]),
    architectEmail: text("architect_email").notNull(),
    architectName: text("architect_name"),
    architectCompany: text("architect_company"),
    supplierId: integer("supplier_id").notNull(),
    supplierName: text("supplier_name").notNull(),
    supplierEmail: text("supplier_email"),
    notes: text("notes"),
    sentBy: text("sent_by").notNull().default("jerit"),
    sentAt: timestamp("sent_at").defaultNow().notNull(),
    architectReplied: boolean("architect_replied").notNull().default(false),
    architectRepliedAt: timestamp("architect_replied_at"),
  },
  (t) => ({
    architectEmailIdx: index("idx_concierge_routes_architect_email").on(t.architectEmail),
    sentAtIdx: index("idx_concierge_routes_sent_at").on(t.sentAt),
    repliedIdx: index("idx_concierge_routes_replied").on(t.architectReplied),
  })
);

export type ConciergeRoute = typeof conciergeRoutes.$inferSelect;
export type InsertConciergeRoute = typeof conciergeRoutes.$inferInsert;
// ── App Settings (key-value store for OAuth tokens, feature flags, etc.) ──────
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AppSetting = typeof appSettings.$inferSelect;

// ── Founder Video Messaging ───────────────────────────────────────────────────
// ── Founder Videos (async video messaging from founder to suppliers/architects) ──
export const founderVideoStatusEnum = pgEnum("founder_video_status", ["draft", "ready", "deleted"]);
export const founderVideoTranscriptStatusEnum = pgEnum("founder_video_transcript_status", [
  "pending", "done", "failed",
]);

export const founderVideos = pgTable("founder_videos", {
  id: serial("id").primaryKey(),
  ownerUserId: integer("ownerUserId").notNull(),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  recipientName: varchar("recipientName", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  note: text("note"),
  shareToken: varchar("shareToken", { length: 32 }).notNull().unique(),
  blobKey: text("blobKey").notNull(),
  blobUrl: text("blobUrl").notNull(),
  durationSec: integer("durationSec").default(0).notNull(),
  status: founderVideoStatusEnum("status").default("draft").notNull(),
  transcript: text("transcript"),
  transcriptStatus: founderVideoTranscriptStatusEnum("transcriptStatus").default("pending").notNull(),
  watchedCount: integer("watchedCount").default(0).notNull(),
  firstWatchedAt: timestamp("firstWatchedAt"),
  lastWatchedAt: timestamp("lastWatchedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
});

export type FounderVideo = typeof founderVideos.$inferSelect;
export type InsertFounderVideo = typeof founderVideos.$inferInsert;

export const founderVideoViews = pgTable("founder_video_views", {
  id: serial("id").primaryKey(),
  videoId: integer("videoId").notNull(),
  viewedAt: timestamp("viewedAt").defaultNow().notNull(),
  viewerIp: varchar("viewerIp", { length: 64 }),
  userAgent: text("userAgent"),
  durationWatchedSec: integer("durationWatchedSec"),
});

export type FounderVideoView = typeof founderVideoViews.$inferSelect;

// ── Audit Log ─────────────────────────────────────────────────────────────────
// Immutable record of security-relevant and business-critical events.
// Never update or delete rows — append only.
// Accessible only to greenchainz_admin in the application layer.

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  // Who performed the action
  actorUserId: integer("actorUserId"),          // null for system/scheduler actions
  actorEmail: varchar("actorEmail", { length: 320 }),
  actorRole: varchar("actorRole", { length: 32 }),
  // What they did
  action: varchar("action", { length: 64 }).notNull(),
  // What resource was affected
  resourceType: varchar("resourceType", { length: 64 }),
  resourceId: varchar("resourceId", { length: 128 }),
  // Freeform structured context (no PII beyond what's already in actor fields)
  metadata: json("metadata"),
  // Result
  outcome: varchar("outcome", { length: 16 }).default("success").notNull(), // "success" | "failure" | "blocked"
  // Network context
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  // Immutable timestamp
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  actorIdx: index("audit_logs_actor_idx").on(table.actorUserId),
  actionIdx: index("audit_logs_action_idx").on(table.action),
  createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
  resourceIdx: index("audit_logs_resource_idx").on(table.resourceType, table.resourceId),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ── RFQ Match Runs — append-only SWAP Engine audit ────────────────────────────
// Every invocation of runSwapEngine writes one row. Never update or delete.
// Used for: supplier scorecard analytics, per-run reasoning audit, CCPS trend analysis.

export const rfqMatchRuns = pgTable(
  "rfq_match_runs",
  {
    id: serial("id").primaryKey(),
    draftId: integer("draft_id"),                                    // rfq_drafts.id (set post-save)
    userId: integer("user_id").notNull(),
    personaKey: varchar("persona_key", { length: 50 }).notNull(),    // e.g. "architect"
    agentAvailable: boolean("agent_available").notNull(),
    matchSource: varchar("match_source", { length: 32 }).notNull(),  // "agent" | "fallback"
    candidateCount: integer("candidate_count").notNull().default(0),
    shortlistCount: integer("shortlist_count").notNull().default(0),
    /** Full ScoreBreakdown[] JSON for every candidate scored in this run */
    scoreBreakdowns: json("score_breakdowns"),
    reasoningTrace: json("reasoning_trace").$type<string[]>(),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    draftIdx: index("idx_match_runs_draft").on(table.draftId),
    userIdx: index("idx_match_runs_user").on(table.userId),
    createdAtIdx: index("idx_match_runs_created_at").on(table.createdAt),
  }),
);

export type RfqMatchRun = typeof rfqMatchRuns.$inferSelect;
export type InsertRfqMatchRun = typeof rfqMatchRuns.$inferInsert;

// ── RFQ Supplier Invites — auto-match audit + notification tracking ────────────
// One row per (rfq, supplier) pair. Inserted when the auto-matcher runs.
// uniqueIndex prevents double-notifying the same supplier on the same RFQ.

export const rfqSupplierInvites = pgTable(
  "rfq_supplier_invites",
  {
    id: serial("id").primaryKey(),
    rfqId: integer("rfq_id").notNull(),
    supplierId: integer("supplier_id").notNull(),
    matchScore: decimal("match_score", { precision: 5, scale: 2 }),
    emailSent: boolean("email_sent").default(false).notNull(),
    inAppSent: boolean("in_app_sent").default(false).notNull(),
    respondedAt: timestamp("responded_at"),   // set when rfqBid is inserted
    notifiedAt: timestamp("notified_at").defaultNow().notNull(),
  },
  (table) => ({
    rfqIdx: index("idx_rsi_rfq").on(table.rfqId),
    supplierIdx: index("idx_rsi_supplier").on(table.supplierId),
    uniquePair: uniqueIndex("idx_rsi_unique").on(table.rfqId, table.supplierId),
  }),
);

export type RfqSupplierInvite = typeof rfqSupplierInvites.$inferSelect;

// ── Supplier Sustainability Profiles ──────────────────────────────────────────
// One row per supplier. Partial save is allowed — no fields are mandatory at DB
// level. The application layer enforces "Required to go live" rules via the
// Data Ladder (L0–L3). Last-updated audit trail is baked in.

export const supplierSustainabilityProfiles = pgTable(
  "supplier_sustainability_profiles",
  {
    id: serial("id").primaryKey(),
    supplierId: integer("supplier_id").notNull().unique(),

    // ── Data ladder ─────────────────────────────────────────────────────────
    // Inferred by the server from the combination of fields below.
    // L0 = proxy/none · L1 = self-reported · L2 = third-party · L3 = EPD
    dataQualityLevel: varchar("data_quality_level", { length: 2 }).default("L0").notNull(),
    dataSourceType: varchar("data_source_type", { length: 50 }),

    // ── EPD / product documentation ─────────────────────────────────────────
    hasEpd: boolean("has_epd").default(false).notNull(),
    epdReference: text("epd_reference"),

    // ── Scope 1 + 2 emissions (tCO₂e) ──────────────────────────────────────
    // Computed by emissions-calculator.ts from energy inputs below
    scope1Emissions: decimal("scope1_emissions", { precision: 14, scale: 4 }),
    scope2Emissions: decimal("scope2_emissions", { precision: 14, scale: 4 }),
    totalEmissions: decimal("total_emissions", { precision: 14, scale: 4 }),

    // ── SME-friendly calculator inputs ───────────────────────────────────────
    // Suppliers enter their annual utility bill numbers — we do the math.
    electricityKwh: decimal("electricity_kwh", { precision: 14, scale: 2 }),
    naturalGasMmbtu: decimal("natural_gas_mmbtu", { precision: 14, scale: 2 }),
    dieselGallons: decimal("diesel_gallons", { precision: 14, scale: 2 }),

    // ── Spend-based fallback (L0 only) ───────────────────────────────────────
    annualRevenue: decimal("annual_revenue", { precision: 16, scale: 2 }),

    // ── Certifications ────────────────────────────────────────────────────────
    certifications: json("certifications").$type<string[]>().default([]),

    // ── Audit trail (required for all value changes) ─────────────────────────
    calculationMethod: varchar("calculation_method", { length: 100 }),  // "energy_bill" | "spend_based" | "epd" | "manual"
    lastUpdatedBy: integer("last_updated_by"),  // users.id of who last saved
    verifiedAt: timestamp("verified_at"),
    verifiedBy: integer("verified_by"),      // admin users.id

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    supplierIdx: index("idx_ssp_supplier").on(table.supplierId),
    qualityIdx: index("idx_ssp_quality").on(table.dataQualityLevel),
  }),
);

export type SupplierSustainabilityProfile = typeof supplierSustainabilityProfiles.$inferSelect;
export type InsertSupplierSustainabilityProfile = typeof supplierSustainabilityProfiles.$inferInsert;

// ── GreenChainz Proof Ledger — Blockchain Anchors ────────────────────────────
// Immutable record of every artifact anchored on Polygon via AnchorRegistry.sol.
// Append-only: never update or delete rows. Use verificationStatus only for
// internal state tracking (e.g. "anchored" → "mismatch_detected").
//
// artifactType values:
//   "epd"                — verified EPD document
//   "certification"      — supplier certification (LEED, FSC, GreenGuard, etc.)
//   "material_score"     — material credit score snapshot
//   "material_submittal" — approved CSI material submittal PDF
//   "supplier_audit"     — AI Audit Agent verification record
//
// artifactId is stored as varchar to support both integer IDs (suppliers,
// materials) and string IDs (EPD numbers from external providers like EC3).

export const blockchainAnchors = pgTable(
  "blockchain_anchors",
  {
    id: serial("id").primaryKey(),

    // Who initiated this anchor (null for automated/system anchors)
    anchoredByUserId: integer("anchored_by_user_id"),

    // What was anchored
    artifactType: varchar("artifact_type", { length: 64 }).notNull(),
    artifactId: varchar("artifact_id", { length: 255 }).notNull(),

    // Cryptographic proof — keccak256 hashes (66 chars: "0x" + 64 hex)
    artifactHash: varchar("artifact_hash", { length: 66 }).notNull(),
    contextHash: varchar("context_hash", { length: 66 }).notNull(),

    // Chain location
    chainId: integer("chain_id").notNull(),
    contractAddress: varchar("contract_address", { length: 42 }).notNull(),
    txHash: varchar("tx_hash", { length: 66 }).notNull().unique(),
    blockNumber: integer("block_number"),

    // Internal state — never alter historical proof records
    verificationStatus: varchar("verification_status", { length: 32 })
      .notNull()
      .default("anchored"),

    anchoredAt: timestamp("anchored_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    artifactIdx: index("idx_bc_anchors_artifact").on(table.artifactType, table.artifactId),
    txHashIdx: index("idx_bc_anchors_tx_hash").on(table.txHash),
    userIdx: index("idx_bc_anchors_user").on(table.anchoredByUserId),
    anchoredAtIdx: index("idx_bc_anchors_anchored_at").on(table.anchoredAt),
  })
);

export type BlockchainAnchor = typeof blockchainAnchors.$inferSelect;
export type InsertBlockchainAnchor = typeof blockchainAnchors.$inferInsert;

// ─── Data Subject Requests (CCPA / GDPR) ────────────────────────────────────
// Tracks privacy requests (access, correction, deletion) so they can be
// serviced and audited. Required before any enterprise supplier MSA can be signed.

export const dataSubjectRequestTypeEnum = pgEnum("data_subject_request_type", [
  "access",
  "correction",
  "deletion",
]);

export const dataSubjectRequestStatusEnum = pgEnum("data_subject_request_status", [
  "pending",
  "in_progress",
  "completed",
  "rejected",
]);

export const dataSubjectRequests = pgTable(
  "data_subject_requests",
  {
    id: serial("id").primaryKey(),
    // Admin who created this request record (null if submitted via public form).
    requestedByAdminId: integer("requested_by_admin_id"),
    // The user whose data is being acted on.
    targetUserId: integer("target_user_id").notNull(),
    type: dataSubjectRequestTypeEnum("type").notNull(),
    status: dataSubjectRequestStatusEnum("status").default("pending").notNull(),
    // Free-form notes from the handling admin (e.g. "email received 2026-06-10").
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    targetUserIdx: index("idx_dsr_target_user").on(table.targetUserId),
    statusIdx: index("idx_dsr_status").on(table.status),
  })
);

export type DataSubjectRequest = typeof dataSubjectRequests.$inferSelect;
export type InsertDataSubjectRequest = typeof dataSubjectRequests.$inferInsert;
