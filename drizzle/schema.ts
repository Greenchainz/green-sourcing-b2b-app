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
  json,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

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
export const supplierTierEnum = pgEnum("supplier_tier", ["free", "premium"]);
export const supplierStatusEnum = pgEnum("supplier_status", ["active", "canceled", "past_due", "suspended", "pending"]);
export const buyerStatusEnum = pgEnum("buyer_status", ["active", "canceled", "past_due", "suspended", "pending", "trial"]);
export const verificationStatusEnum = pgEnum("verification_status", ["pending", "approved", "rejected"]);
export const usageDimensionEnum = pgEnum("usage_dimension", [
  "rfq_submission", "ai_query", "swap_analysis", "ccps_export",
  "material_comparison", "supplier_match", "message_thread",
  "bid_submission", "video_call", "message_sent",
]);
export const swapValidationStatusEnum = pgEnum("swap_validation_status", ["APPROVED", "EXPERIMENTAL", "REJECTED"]);

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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
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
});

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
  dueDate: timestamp("dueDate"),
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
  description: text("description"),
  location: varchar("location", { length: 255 }),
  certifications: json("certifications").$type<string[]>(),
  maxOrderValue: decimal("maxOrderValue", { precision: 12, scale: 2 }),
  currentCapacity: integer("currentCapacity").default(100),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

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
  },
  (table) => ({
    categoryIdx: index("idx_assembly_specs_category").on(table.category),
    ulDesignIdx: index("idx_assembly_specs_ul").on(table.ulDesignNumber),
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

// ─── Email Suppression List ─────────────────────────────────────────────────

export const emailSuppressionList = pgTable("email_suppression_list", {
  email: varchar("email", { length: 255 }).primaryKey(),
  reason: varchar("reason", { length: 100 }),
  suppressedAt: timestamp("suppressed_at").defaultNow().notNull(),
  permanent: boolean("permanent").default(false).notNull(),
});

export type EmailSuppression = typeof emailSuppressionList.$inferSelect;
export type InsertEmailSuppression = typeof emailSuppressionList.$inferInsert;
