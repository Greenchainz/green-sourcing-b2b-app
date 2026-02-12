import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  tinyint,
} from "drizzle-orm/mysql-core";

// ─── Users ──────────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  persona: mysqlEnum("persona", [
    "architect", "leed_ap", "gc_pm", "spec_writer", "owner", "facility_manager", "default",
  ]).default("default"),
  companyName: varchar("companyName", { length: 255 }),
  jobTitle: varchar("jobTitle", { length: 255 }),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Manufacturers ──────────────────────────────────────────────────────────

export const manufacturers = mysqlTable("manufacturers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  website: text("website"),
  logoUrl: text("logoUrl"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  headquarters: varchar("headquarters", { length: 255 }),
  sustainabilityPageUrl: text("sustainabilityPageUrl"),
  verified: tinyint("verified").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Manufacturer = typeof manufacturers.$inferSelect;

// ─── Materials ──────────────────────────────────────────────────────────────

export const materials = mysqlTable("materials", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  productName: varchar("productName", { length: 255 }),
  manufacturerId: int("manufacturerId"),
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
  onRedList: tinyint("onRedList").default(0),
  hasEpd: tinyint("hasEpd").default(0),
  hasHpd: tinyint("hasHpd").default(0),
  hasFsc: tinyint("hasFsc").default(0),
  hasC2c: tinyint("hasC2c").default(0),
  hasGreenguard: tinyint("hasGreenguard").default(0),
  hasDeclare: tinyint("hasDeclare").default(0),
  recycledContentPct: decimal("recycledContentPct", { precision: 5, scale: 2 }),
  leadTimeDays: int("leadTimeDays"),
  usManufactured: tinyint("usManufactured").default(0),
  regionalAvailabilityMiles: int("regionalAvailabilityMiles"),
  hasTakeBackProgram: tinyint("hasTakeBackProgram").default(0),
  pricePerUnit: decimal("pricePerUnit", { precision: 10, scale: 2 }),
  priceUnit: varchar("priceUnit", { length: 50 }),
  astmStandards: text("astmStandards"),
  meetsTitle24: tinyint("meetsTitle24").default(0),
  meetsIecc: tinyint("meetsIecc").default(0),
  leedCredits: text("leedCredits"),
  expectedLifecycleYears: int("expectedLifecycleYears"),
  warrantyYears: int("warrantyYears"),
  dataSource: varchar("dataSource", { length: 100 }),
  verified: tinyint("verified").default(0),
  imageUrl: text("imageUrl"),
  specSheetUrl: text("specSheetUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Material = typeof materials.$inferSelect;

// ─── Assemblies ─────────────────────────────────────────────────────────────

export const assemblies = mysqlTable("assemblies", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }),
  assemblyType: varchar("assemblyType", { length: 100 }).notNull(),
  description: text("description"),
  sustainabilityTier: mysqlEnum("sustainabilityTier", ["good", "better", "best"]).default("good"),
  totalGwpPer1000Sqft: decimal("totalGwpPer1000Sqft", { precision: 12, scale: 2 }),
  totalRValue: decimal("totalRValue", { precision: 8, scale: 2 }),
  estimatedCostPer1000Sqft: decimal("estimatedCostPer1000Sqft", { precision: 10, scale: 2 }),
  fireRating: varchar("fireRating", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Assembly = typeof assemblies.$inferSelect;

// ─── Assembly Components ────────────────────────────────────────────────────

export const assemblyComponents = mysqlTable("assembly_components", {
  id: int("id").autoincrement().primaryKey(),
  assemblyId: int("assemblyId").notNull(),
  materialId: int("materialId"),
  layerOrder: int("layerOrder").notNull(),
  layerName: varchar("layerName", { length: 255 }).notNull(),
  thickness: varchar("thickness", { length: 50 }),
  gwpContribution: decimal("gwpContribution", { precision: 12, scale: 4 }),
  notes: text("notes"),
});

export type AssemblyComponent = typeof assemblyComponents.$inferSelect;

// ─── Material Certifications ────────────────────────────────────────────────

export const materialCertifications = mysqlTable("material_certifications", {
  id: int("id").autoincrement().primaryKey(),
  materialId: int("materialId").notNull(),
  certificationType: varchar("certificationType", { length: 100 }).notNull(),
  certificationName: varchar("certificationName", { length: 255 }),
  certificationNumber: varchar("certificationNumber", { length: 100 }),
  issuingBody: varchar("issuingBody", { length: 255 }),
  issueDate: timestamp("issueDate"),
  expirationDate: timestamp("expirationDate"),
  certificationUrl: text("certificationUrl"),
  leedCreditCategory: varchar("leedCreditCategory", { length: 100 }),
  leedCreditNumber: varchar("leedCreditNumber", { length: 50 }),
  leedPointsValue: int("leedPointsValue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MaterialCertification = typeof materialCertifications.$inferSelect;

// ─── CCPS Baselines ─────────────────────────────────────────────────────────

export const ccpsBaselines = mysqlTable("ccps_baselines", {
  id: int("id").autoincrement().primaryKey(),
  category: varchar("category", { length: 100 }).notNull(),
  baselineGwpPerUnit: decimal("baselineGwpPerUnit", { precision: 12, scale: 4 }),
  baselinePricePerUnit: decimal("baselinePricePerUnit", { precision: 10, scale: 2 }),
  baselineLeadTimeDays: int("baselineLeadTimeDays"),
  baselineRecycledPct: decimal("baselineRecycledPct", { precision: 5, scale: 2 }),
  sampleSize: int("sampleSize"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CcpsBaseline = typeof ccpsBaselines.$inferSelect;

// ─── CCPS Scores (cached) ───────────────────────────────────────────────────

export const ccpsScores = mysqlTable("ccps_scores", {
  id: int("id").autoincrement().primaryKey(),
  materialId: int("materialId").notNull(),
  personaKey: varchar("personaKey", { length: 50 }).notNull(),
  carbonScore: int("carbonScore"),
  complianceScore: int("complianceScore"),
  certificationScore: int("certificationScore"),
  costScore: int("costScore"),
  supplyChainScore: int("supplyChainScore"),
  healthScore: int("healthScore"),
  ccpsTotal: int("ccpsTotal"),
  sourcingDifficulty: int("sourcingDifficulty"),
  calculatedAt: timestamp("calculatedAt").defaultNow().notNull(),
});

export type CcpsScore = typeof ccpsScores.$inferSelect;

// ─── Decision Maker Personas ────────────────────────────────────────────────

export const decisionMakerPersonas = mysqlTable("decision_maker_personas", {
  id: int("id").autoincrement().primaryKey(),
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

export const rfqs = mysqlTable("rfqs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  projectName: varchar("projectName", { length: 255 }).notNull(),
  projectLocation: varchar("projectLocation", { length: 255 }),
  projectType: varchar("projectType", { length: 100 }),
  status: mysqlEnum("status", ["draft", "submitted", "responded", "awarded", "closed"]).default("draft"),
  notes: text("notes"),
  dueDate: timestamp("dueDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Rfq = typeof rfqs.$inferSelect;

// ─── RFQ Items ──────────────────────────────────────────────────────────────

export const rfqItems = mysqlTable("rfq_items", {
  id: int("id").autoincrement().primaryKey(),
  rfqId: int("rfqId").notNull(),
  materialId: int("materialId"),
  assemblyId: int("assemblyId"),
  quantity: decimal("quantity", { precision: 12, scale: 2 }),
  quantityUnit: varchar("quantityUnit", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RfqItem = typeof rfqItems.$inferSelect;

// ─── Leads ──────────────────────────────────────────────────────────────────

export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 255 }),
  company: varchar("company", { length: 255 }),
  source: varchar("source", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;

// ─── Agent Conversations ───────────────────────────────────────────────────

export const agentConversations = mysqlTable("agent_conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  sessionId: varchar("sessionId", { length: 255 }).notNull(),
  agent: varchar("agent", { length: 50 }).notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  metadata: text("metadata"), // JSON string: context, tool calls, etc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentConversation = typeof agentConversations.$inferSelect;

// ─── Agent Analytics ───────────────────────────────────────────────────────

export const agentAnalytics = mysqlTable("agent_analytics", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 255 }).notNull(),
  agent: varchar("agent", { length: 50 }).notNull(),
  intentClassified: varchar("intentClassified", { length: 100 }),
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  toolsUsed: text("toolsUsed"), // JSON array of tool names
  responseTimeMs: int("responseTimeMs"),
  escalated: tinyint("escalated").default(0),
  handedOffToHuman: tinyint("handedOffToHuman").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentAnalytic = typeof agentAnalytics.$inferSelect;

// ─── Suppliers ──────────────────────────────────────────────────────────────

export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Link to users table (supplier account)
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
  isPremium: tinyint("isPremium").default(0),
  premiumExpiresAt: timestamp("premiumExpiresAt"),
  sustainabilityScore: decimal("sustainabilityScore", { precision: 3, scale: 2 }), // 0-100, from D&B
  verified: tinyint("verified").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

// ─── Supplier Subscriptions ─────────────────────────────────────────────────

export const supplierSubscriptions = mysqlTable("supplier_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  supplierId: int("supplierId").notNull(),
  tier: mysqlEnum("tier", ["free", "premium"]).default("free"),
  msSubscriptionId: varchar("msSubscriptionId", { length: 255 }), // Microsoft Marketplace subscription ID
  msPlanId: varchar("msPlanId", { length: 255 }), // Microsoft Marketplace plan ID
  status: mysqlEnum("status", ["active", "canceled", "past_due", "suspended", "pending"]).default("active"),
  renewalDate: timestamp("renewalDate"),
  isBeta: tinyint("isBeta").default(0), // Founding member beta flag
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SupplierSubscription = typeof supplierSubscriptions.$inferSelect;

// ─── Buyer Subscriptions ───────────────────────────────────────────────────

export const buyerSubscriptions = mysqlTable("buyer_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tier: mysqlEnum("tier", ["free", "standard", "premium"]).default("free"),
  msSubscriptionId: varchar("msSubscriptionId", { length: 255 }), // Microsoft Marketplace subscription ID
  msPlanId: varchar("msPlanId", { length: 255 }), // Microsoft Marketplace plan ID
  status: mysqlEnum("status", ["active", "canceled", "past_due", "suspended", "pending", "trial"]).default("active"),
  trialEndsAt: timestamp("trialEndsAt"),
  renewalDate: timestamp("renewalDate"),
  isBeta: tinyint("isBeta").default(0), // Founding member beta flag
  maxSeats: int("maxSeats").default(1), // Standard=3, Premium=10
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BuyerSubscription = typeof buyerSubscriptions.$inferSelect;

// ─── Usage Tracking (Metered Billing) ──────────────────────────────────────

export const usageTracking = mysqlTable("usage_tracking", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  supplierId: int("supplierId"),
  dimension: mysqlEnum("dimension", [
    "rfq_submission",
    "ai_query",
    "swap_analysis",
    "ccps_export",
    "material_comparison",
    "supplier_match",
    "message_thread",
    "bid_submission",
  ]).notNull(),
  quantity: int("quantity").default(0).notNull(),
  periodStart: timestamp("periodStart").notNull(), // Start of billing period
  periodEnd: timestamp("periodEnd").notNull(), // End of billing period
  reportedToMs: tinyint("reportedToMs").default(0), // Whether overage was reported to Microsoft metering API
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UsageTracking = typeof usageTracking.$inferSelect;

// ─── Supplier Filters ───────────────────────────────────────────────────────

export const supplierFilters = mysqlTable("supplier_filters", {
  id: int("id").autoincrement().primaryKey(),
  supplierId: int("supplierId").notNull(),
  materialTypeId: int("materialTypeId"), // e.g., "insulation", "flooring"
  minPrice: decimal("minPrice", { precision: 10, scale: 2 }),
  maxPrice: decimal("maxPrice", { precision: 10, scale: 2 }),
  minLeadDays: int("minLeadDays"),
  maxLeadDays: int("maxLeadDays"),
  serviceRadius: int("serviceRadius"), // miles from supplier location
  acceptedLocations: text("acceptedLocations"), // JSON array of states/regions
  minOrderQuantity: decimal("minOrderQuantity", { precision: 12, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SupplierFilter = typeof supplierFilters.$inferSelect;

// ─── RFQ Bids ───────────────────────────────────────────────────────────────

export const rfqBids = mysqlTable("rfq_bids", {
  id: int("id").autoincrement().primaryKey(),
  rfqId: int("rfqId").notNull(),
  supplierId: int("supplierId").notNull(),
  status: mysqlEnum("status", ["submitted", "accepted", "rejected", "expired"]).default("submitted"),
  bidPrice: decimal("bidPrice", { precision: 12, scale: 2 }),
  leadDays: int("leadDays"),
  notes: text("notes"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RfqBid = typeof rfqBids.$inferSelect;

// ─── RFQ Message Threads ────────────────────────────────────────────────────

export const rfqThreads = mysqlTable("rfq_threads", {
  id: int("id").autoincrement().primaryKey(),
  rfqId: int("rfqId").notNull(),
  supplierId: int("supplierId").notNull(),
  buyerId: int("buyerId").notNull(), // Link to users table
  status: mysqlEnum("status", ["active", "closed", "archived"]).default("active"),
  lastMessageAt: timestamp("lastMessageAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RfqThread = typeof rfqThreads.$inferSelect;

// ─── RFQ Messages ───────────────────────────────────────────────────────────

export const rfqMessages = mysqlTable("rfq_messages", {
  id: int("id").autoincrement().primaryKey(),
  threadId: int("threadId").notNull(),
  senderId: int("senderId").notNull(), // Link to users table (buyer or supplier)
  senderType: mysqlEnum("senderType", ["buyer", "supplier"]).notNull(),
  content: text("content").notNull(),
  isRead: tinyint("isRead").default(0),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RfqMessage = typeof rfqMessages.$inferSelect;

// ─── Notifications ──────────────────────────────────────────────────────────

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["rfq_match", "new_message", "bid_accepted", "bid_rejected", "rfq_closed"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  relatedRfqId: int("relatedRfqId"),
  relatedThreadId: int("relatedThreadId"),
  isRead: tinyint("isRead").default(0),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;

// ─── RFQ Analytics ──────────────────────────────────────────────────────────

export const rfqAnalytics = mysqlTable("rfq_analytics", {
  id: int("id").autoincrement().primaryKey(),
  rfqId: int("rfqId").notNull(),
  totalBidsReceived: int("totalBidsReceived").default(0),
  avgBidPrice: decimal("avgBidPrice", { precision: 12, scale: 2 }),
  lowestBidPrice: decimal("lowestBidPrice", { precision: 12, scale: 2 }),
  highestBidPrice: decimal("highestBidPrice", { precision: 12, scale: 2 }),
  avgResponseTimeHours: decimal("avgResponseTimeHours", { precision: 5, scale: 2 }),
  winningBidId: int("winningBidId"),
  purchasedAt: timestamp("purchasedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RfqAnalytic = typeof rfqAnalytics.$inferSelect;

// ─── Material Swaps ─────────────────────────────────────────────────────────

export const materialSwaps = mysqlTable("material_swaps", {
  id: int("id").autoincrement().primaryKey(),
  materialId: int("materialId").notNull(), // Original material
  swapMaterialId: int("swapMaterialId").notNull(), // Recommended swap
  swapReason: text("swapReason"), // Why this is a good swap
  swapScore: int("swapScore").notNull(), // 0-100, how good the swap is
  swapTier: mysqlEnum("swapTier", ["good", "better", "best"]).notNull(), // Good/Better/Best ranking
  confidence: decimal("confidence", { precision: 5, scale: 2 }).notNull(), // 0.00-1.00, algorithm confidence
  createdBy: mysqlEnum("createdBy", ["algorithm", "agent", "admin"]).notNull(),
  usageCount: int("usageCount").default(0), // How many times this swap was used in RFQs
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MaterialSwap = typeof materialSwaps.$inferSelect;
