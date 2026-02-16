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
  json,
  index,
} from "drizzle-orm/mysql-core";

// ─── Users ──────────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "buyer", "supplier"]).default("user").notNull(),
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
  // EC3 (Building Transparency) tracking fields
  ec3Id: varchar("ec3Id", { length: 100 }), // EC3 EPD ID or open_xpd_uuid
  ec3SyncedAt: timestamp("ec3SyncedAt"), // Last sync timestamp from EC3 API
  ec3Category: varchar("ec3Category", { length: 100 }), // EC3 category name
  ec3ConservativeEstimate: varchar("ec3ConservativeEstimate", { length: 50 }), // Conservative GWP estimate
  ec3BestPractice: varchar("ec3BestPractice", { length: 50 }), // Best practice GWP
  ec3IndustryMedian: varchar("ec3IndustryMedian", { length: 50 }), // Industry median (pct50_gwp)
  complianceGrade: mysqlEnum("complianceGrade", ["A", "B", "C", "D", "F"]).default("C"), // Compliance grade (A=best, F=worst)
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

// ─── Material Specifications (Supplier-Submitted) ───────────────────────────

export const materialSpecs = mysqlTable("material_specs", {
  id: int("id").autoincrement().primaryKey(),
  materialId: int("materialId").notNull(), // Link to materials table
  supplierId: int("supplierId").notNull(), // Link to suppliers table
  submittedBy: int("submittedBy").notNull(), // User ID who submitted
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  
  // Compliance metrics
  fireRating: varchar("fireRating", { length: 50 }),
  fireRatingStandard: varchar("fireRatingStandard", { length: 100 }),
  rValue: decimal("rValue", { precision: 8, scale: 2 }),
  thermalUValue: decimal("thermalUValue", { precision: 8, scale: 4 }),
  compressiveStrength: varchar("compressiveStrength", { length: 100 }), // e.g., "3000 psi"
  tensileStrength: varchar("tensileStrength", { length: 100 }),
  astmStandards: text("astmStandards"), // JSON array of ASTM standards
  meetsTitle24: tinyint("meetsTitle24").default(0),
  meetsIecc: tinyint("meetsIecc").default(0),
  buildingCodes: text("buildingCodes"), // JSON array of applicable codes
  
  // Cost metrics
  pricePerUnit: decimal("pricePerUnit", { precision: 10, scale: 2 }),
  priceUnit: varchar("priceUnit", { length: 50 }), // e.g., "per SF", "per unit"
  minimumOrderQuantity: int("minimumOrderQuantity"),
  moqUnit: varchar("moqUnit", { length: 50 }),
  bulkDiscountAvailable: tinyint("bulkDiscountAvailable").default(0),
  
  // Supply chain metrics
  leadTimeDays: int("leadTimeDays"),
  manufacturingLocation: varchar("manufacturingLocation", { length: 255 }),
  usManufactured: tinyint("usManufactured").default(0),
  regionalAvailabilityMiles: int("regionalAvailabilityMiles"),
  shippingRegions: text("shippingRegions"), // JSON array of regions
  inStock: tinyint("inStock").default(1),
  stockQuantity: int("stockQuantity"),
  
  // Health metrics
  vocLevel: varchar("vocLevel", { length: 50 }), // e.g., "< 50 g/L"
  vocCertification: varchar("vocCertification", { length: 100 }),
  onRedList: tinyint("onRedList").default(0),
  toxicityRating: varchar("toxicityRating", { length: 50 }),
  indoorAirQualityRating: varchar("indoorAirQualityRating", { length: 50 }),
  
  // Certifications
  hasEpd: tinyint("hasEpd").default(0),
  hasHpd: tinyint("hasHpd").default(0),
  hasFsc: tinyint("hasFsc").default(0),
  hasC2c: tinyint("hasC2c").default(0),
  hasGreenguard: tinyint("hasGreenguard").default(0),
  hasDeclare: tinyint("hasDeclare").default(0),
  certificationUrls: text("certificationUrls"), // JSON object {"EPD": "url", "HPD": "url"}
  
  // Supporting documents
  datasheetUrl: text("datasheetUrl"), // Uploaded PDF/doc
  specSheetUrl: text("specSheetUrl"),
  testReportUrls: text("testReportUrls"), // JSON array of URLs
  
  // Additional info
  notes: text("notes"),
  recycledContentPct: decimal("recycledContentPct", { precision: 5, scale: 2 }),
  warrantyYears: int("warrantyYears"),
  expectedLifecycleYears: int("expectedLifecycleYears"),
  
  // Admin review
  reviewedBy: int("reviewedBy"), // Admin user ID
  reviewedAt: timestamp("reviewedAt"),
  rejectionReason: text("rejectionReason"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MaterialSpec = typeof materialSpecs.$inferSelect;
export type InsertMaterialSpec = typeof materialSpecs.$inferInsert;

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
  requiredCertifications: json("requiredCertifications").$type<string[]>(), // ["ISO 9001", "LEED", etc.]
  latitude: decimal("latitude", { precision: 10, scale: 7 }), // Geocoded latitude for distance calculation
  longitude: decimal("longitude", { precision: 10, scale: 7 }), // Geocoded longitude for distance calculation
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
  verificationStatus: mysqlEnum("verificationStatus", ["pending", "approved", "rejected"]).default("pending").notNull(),
  verifiedAt: timestamp("verifiedAt"),
  description: text("description"), // Company description for admin review
  location: varchar("location", { length: 255 }), // Human-readable location (City, State)
  certifications: json("certifications").$type<string[]>(), // ["ISO 9001", "LEED", "FSC", etc.]
  maxOrderValue: decimal("maxOrderValue", { precision: 12, scale: 2 }), // Maximum order value supplier can handle
  currentCapacity: int("currentCapacity").default(100), // Current capacity percentage (0-100)
  latitude: decimal("latitude", { precision: 10, scale: 7 }), // Geocoded latitude for distance calculation
  longitude: decimal("longitude", { precision: 10, scale: 7 }), // Geocoded longitude for distance calculation
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
    "video_call", // Video calling usage
    "message_sent", // Message sending usage
  ]),
  quantity: int("quantity").default(0).notNull(),
  videoMinutesUsed: int("videoMinutesUsed").default(0), // Track video call duration
  messagesCount: int("messagesCount").default(0), // Track message count
  periodStart: timestamp("periodStart"), // Start of billing period
  periodEnd: timestamp("periodEnd"), // End of billing period
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
  materialTypePreferences: json("materialTypePreferences").$type<string[]>(), // ["concrete", "steel", "insulation", etc.]
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
  type: mysqlEnum("type", ["rfq_new", "rfq_match", "new_message", "bid_accepted", "bid_rejected", "rfq_closed", "rfq_bid_received"]).notNull(),
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


// ─── Conversations ──────────────────────────────────────────────────────────

export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  rfqId: int("rfqId"), // Optional - null for direct company messaging
  buyerId: int("buyerId").notNull(),
  supplierId: int("supplierId").notNull(),
  // Agent handoff fields
  agentMode: mysqlEnum("agentMode", ["agent_first", "human_only", "hybrid"]).default("agent_first").notNull(),
  handoffStatus: mysqlEnum("handoffStatus", ["agent", "pending_handoff", "human"]).default("agent").notNull(),
  agentMessageCount: int("agentMessageCount").default(0).notNull(),
  handoffRequestedAt: timestamp("handoffRequestedAt"),
  handoffReason: text("handoffReason"),
  // eBay-style features
  lastMessage: text("lastMessage"),
  lastMessageAt: timestamp("lastMessageAt").defaultNow().notNull(),
  isPinned: tinyint("isPinned").default(0).notNull(),
  isArchived: tinyint("isArchived").default(0).notNull(),
  label: varchar("label", { length: 50 }), // "urgent", "follow_up", "negotiating", "closed"
  labelColor: varchar("labelColor", { length: 20 }), // hex color for label
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

// ─── Messages ───────────────────────────────────────────────────────────────

export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  senderId: int("senderId").notNull(),
  senderType: mysqlEnum("senderType", ["user", "agent", "support"]).default("user").notNull(),
  agentType: varchar("agentType", { length: 100 }), // "material", "rfq", "supplier", "triage"
  content: text("content").notNull(),
  // eBay-style features
  isRead: tinyint("isRead").default(0).notNull(),
  readAt: timestamp("readAt"),
  attachmentUrl: text("attachmentUrl"),
  attachmentType: varchar("attachmentType", { length: 50 }), // "image", "pdf", "document"
  attachmentName: varchar("attachmentName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// ─── Subscriptions (Microsoft AppSource) ────────────────────────────────────

export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  microsoftSubscriptionId: varchar("microsoftSubscriptionId", { length: 255 }).notNull().unique(),
  tier: mysqlEnum("tier", ["free", "standard", "premium"]).default("free").notNull(),
  status: mysqlEnum("status", ["active", "suspended", "cancelled", "expired"]).default("active").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  lastRenewalDate: timestamp("lastRenewalDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

// ─── Video Calls ────────────────────────────────────────────────────────────

export const videoCalls = mysqlTable("video_calls", {
  id: int("id").autoincrement().primaryKey(),
  callId: varchar("callId", { length: 255 }).notNull().unique(),
  callerId: int("callerId").notNull(),
  calleeId: int("calleeId").notNull(),
  conversationId: int("conversationId").notNull(),
  status: mysqlEnum("status", ["initiated", "ringing", "connected", "ended", "failed"]).default("initiated").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
  durationSeconds: int("durationSeconds"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VideoCall = typeof videoCalls.$inferSelect;
export type InsertVideoCall = typeof videoCalls.$inferInsert;

// ─── Agent Handoff Rules (Premium Supplier Feature) ────────────────────────

export const agentHandoffRules = mysqlTable("agent_handoff_rules", {
  id: int("id").autoincrement().primaryKey(),
  supplierId: int("supplierId").notNull().unique(), // One rule set per supplier
  
  // Handoff mode configuration
  handoffMode: mysqlEnum("handoffMode", ["always_agent", "hybrid", "immediate_human"])
    .default("hybrid")
    .notNull(),
  
  // Agent message threshold (for hybrid mode)
  maxAgentMessages: int("maxAgentMessages").default(5).notNull(), // Agent handles up to N messages before offering human
  
  // Business hours for human availability
  businessHoursEnabled: tinyint("businessHoursEnabled").default(0).notNull(),
  businessHoursStart: varchar("businessHoursStart", { length: 5 }), // "09:00"
  businessHoursEnd: varchar("businessHoursEnd", { length: 5 }), // "17:00"
  businessDays: varchar("businessDays", { length: 50 }).default("Mon,Tue,Wed,Thu,Fri"), // Comma-separated
  timezone: varchar("timezone", { length: 50 }).default("America/New_York"),
  
  // Custom agent configuration
  customAgentPrompt: text("customAgentPrompt"), // Supplier-specific agent personality/instructions
  autoDeflectEnabled: tinyint("autoDeflectEnabled").default(1).notNull(), // Try to deflect human requests
  
  // Analytics
  totalConversations: int("totalConversations").default(0).notNull(),
  agentResolutionRate: int("agentResolutionRate").default(0).notNull(), // Percentage (0-100)
  avgMessagesBeforeHandoff: int("avgMessagesBeforeHandoff").default(0).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgentHandoffRule = typeof agentHandoffRules.$inferSelect;
export type InsertAgentHandoffRule = typeof agentHandoffRules.$inferInsert;

// ─── Message Reactions ──────────────────────────────────────────────────────

export const messageReactions = mysqlTable("message_reactions", {
  id: int("id").autoincrement().primaryKey(),
  messageId: int("messageId").notNull(),
  userId: int("userId").notNull(),
  reactionType: varchar("reactionType", { length: 20 }).notNull(), // "thumbs_up", "thumbs_down", "heart", "party", "check"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MessageReaction = typeof messageReactions.$inferSelect;
export type InsertMessageReaction = typeof messageReactions.$inferInsert;


// ─── Call History ───────────────────────────────────────────────────────────

export const callHistory = mysqlTable("call_history", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  callerId: int("callerId").notNull(),
  receiverId: int("receiverId").notNull(),
  callType: mysqlEnum("callType", ["voice", "video"]).notNull(),
  status: mysqlEnum("status", ["completed", "missed", "rejected", "failed"]).notNull(),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime"),
  durationSeconds: int("durationSeconds").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CallHistory = typeof callHistory.$inferSelect;
export type InsertCallHistory = typeof callHistory.$inferInsert;

// ─── Monthly Call Usage ─────────────────────────────────────────────────────

export const monthlyCallUsage = mysqlTable("monthly_call_usage", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  month: varchar("month", { length: 7 }).notNull(), // Format: "2026-02"
  totalMinutes: int("totalMinutes").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MonthlyCallUsage = typeof monthlyCallUsage.$inferSelect;
export type InsertMonthlyCallUsage = typeof monthlyCallUsage.$inferInsert;


// ─── Legal Acceptances ──────────────────────────────────────────────────────

export const legalAcceptances = mysqlTable("legal_acceptances", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  termsAccepted: tinyint("termsAccepted").default(0).notNull(),
  termsAcceptedAt: timestamp("termsAcceptedAt"),
  termsVersion: varchar("termsVersion", { length: 50 }).default("1.0"),
  privacyAccepted: tinyint("privacyAccepted").default(0).notNull(),
  privacyAcceptedAt: timestamp("privacyAcceptedAt"),
  privacyVersion: varchar("privacyVersion", { length: 50 }).default("1.0"),
  cookieConsentGiven: tinyint("cookieConsentGiven").default(0).notNull(),
  cookieConsentAt: timestamp("cookieConsentAt"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LegalAcceptance = typeof legalAcceptances.$inferSelect;
export type InsertLegalAcceptance = typeof legalAcceptances.$inferInsert;


// ─── Location-Based Tables ──────────────────────────────────────────────────

/**
 * Suppliers with geolocation support
 * Stores supplier information with coordinates for distance-based queries
 */
export const suppliersLocation = mysqlTable(
  "suppliers_location",
  {
    id: int("id").autoincrement().primaryKey(),
    supplierId: int("supplier_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    state: varchar("state", { length: 2 }).notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    zipCode: varchar("zip_code", { length: 10 }).notNull(),
    latitude: decimal("latitude", { precision: 10, scale: 6 }).notNull(),
    longitude: decimal("longitude", { precision: 10, scale: 6 }).notNull(),
    materialsAvailable: json("materials_available").$type<string[]>().default([]),
    carbonScore: decimal("carbon_score", { precision: 5, scale: 2 }).default("0"),
    pricePerUnit: decimal("price_per_unit", { precision: 10, scale: 2 }),
    leadTimeDays: int("lead_time_days").default(7),
    contactEmail: varchar("contact_email", { length: 255 }),
    contactPhone: varchar("contact_phone", { length: 20 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    stateIdx: index("idx_suppliers_location_state").on(table.state),
    cityIdx: index("idx_suppliers_location_city").on(table.city),
    latLngIdx: index("idx_suppliers_location_latlng").on(table.latitude, table.longitude),
  })
);

export type SuppliersLocation = typeof suppliersLocation.$inferSelect;
export type InsertSuppliersLocation = typeof suppliersLocation.$inferInsert;

/**
 * Compliance rules table
 * Stores state-specific building codes and compliance requirements
 */
export const complianceRules = mysqlTable(
  "compliance_rules",
  {
    id: int("id").autoincrement().primaryKey(),
    state: varchar("state", { length: 2 }).notNull(),
    buildingCode: varchar("building_code", { length: 100 }).notNull(),
    ruleName: varchar("rule_name", { length: 255 }).notNull(),
    ruleDescription: text("rule_description"),
    appliesToMaterials: json("applies_to_materials").$type<string[]>().default([]),
    complianceType: varchar("compliance_type", { length: 50 }),
    complianceValue: varchar("compliance_value", { length: 100 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    stateIdx: index("idx_compliance_rules_state").on(table.state),
    codeIdx: index("idx_compliance_rules_code").on(table.buildingCode),
  })
);

export type ComplianceRules = typeof complianceRules.$inferSelect;
export type InsertComplianceRules = typeof complianceRules.$inferInsert;

/**
 * Regional swap patterns table
 * Tracks which material swaps are approved/used in each region
 */
export const regionalSwapPatterns = mysqlTable(
  "regional_swap_patterns",
  {
    id: int("id").autoincrement().primaryKey(),
    state: varchar("state", { length: 2 }).notNull(),
    originalMaterial: varchar("original_material", { length: 255 }).notNull(),
    alternativeMaterial: varchar("alternative_material", { length: 255 }).notNull(),
    approvalRate: decimal("approval_rate", { precision: 5, scale: 2 }).default("0"),
    usageCount: int("usage_count").default(0),
    avgCarbonReduction: decimal("avg_carbon_reduction", { precision: 5, scale: 2 }).default("0"),
    avgCostDelta: decimal("avg_cost_delta", { precision: 10, scale: 2 }).default("0"),
    avgPaybackYears: decimal("avg_payback_years", { precision: 5, scale: 2 }).default("0"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    stateIdx: index("idx_swap_patterns_state").on(table.state),
    materialIdx: index("idx_swap_patterns_material").on(table.originalMaterial),
  })
);

export type RegionalSwapPatterns = typeof regionalSwapPatterns.$inferSelect;
export type InsertRegionalSwapPatterns = typeof regionalSwapPatterns.$inferInsert;

/**
 * Shipping cost matrix table
 * Stores shipping costs between regions for different material types
 */
export const shippingCosts = mysqlTable(
  "shipping_costs",
  {
    id: int("id").autoincrement().primaryKey(),
    originState: varchar("origin_state", { length: 2 }).notNull(),
    destinationState: varchar("destination_state", { length: 2 }).notNull(),
    materialType: varchar("material_type", { length: 100 }).notNull(),
    costPerUnit: decimal("cost_per_unit", { precision: 10, scale: 2 }).notNull(),
    daysToDelivery: int("days_to_delivery").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    routeIdx: index("idx_shipping_route").on(table.originState, table.destinationState),
    materialIdx: index("idx_shipping_material").on(table.materialType),
  })
);

export type ShippingCosts = typeof shippingCosts.$inferSelect;
export type InsertShippingCosts = typeof shippingCosts.$inferInsert;

/**
 * Climate zone adjustments table
 * Stores material performance adjustments based on climate zone
 */
export const climateZoneAdjustments = mysqlTable(
  "climate_zone_adjustments",
  {
    id: int("id").autoincrement().primaryKey(),
    climateZone: varchar("climate_zone", { length: 10 }).notNull(),
    materialType: varchar("material_type", { length: 100 }).notNull(),
    durabilityMultiplier: decimal("durability_multiplier", { precision: 3, scale: 2 }).default("1.0"),
    rValueMultiplier: decimal("r_value_multiplier", { precision: 3, scale: 2 }).default("1.0"),
    carbonImpactMultiplier: decimal("carbon_impact_multiplier", { precision: 3, scale: 2 }).default("1.0"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    zoneIdx: index("idx_climate_zone").on(table.climateZone),
    materialIdx: index("idx_climate_material").on(table.materialType),
  })
);

export type ClimateZoneAdjustments = typeof climateZoneAdjustments.$inferSelect;
export type InsertClimateZoneAdjustments = typeof climateZoneAdjustments.$inferInsert;

/**
 * Location-based pricing adjustments table
 * Stores regional pricing variations for materials
 */
export const locationPricingAdjustments = mysqlTable(
  "location_pricing_adjustments",
  {
    id: int("id").autoincrement().primaryKey(),
    state: varchar("state", { length: 2 }).notNull(),
    materialType: varchar("material_type", { length: 100 }).notNull(),
    priceMultiplier: decimal("price_multiplier", { precision: 3, scale: 2 }).default("1.0"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    stateIdx: index("idx_pricing_state").on(table.state),
    materialIdx: index("idx_pricing_material").on(table.materialType),
  })
);

export type LocationPricingAdjustments = typeof locationPricingAdjustments.$inferSelect;
export type InsertLocationPricingAdjustments = typeof locationPricingAdjustments.$inferInsert;


// ─── Swap Engine: Functional Equivalence Validation ────────────────────────

/**
 * Material Technical Specifications
 * Stores detailed showstopper metrics for functional equivalence validation
 */
export const materialTechnicalSpecs = mysqlTable(
  "material_technical_specs",
  {
    id: int("id").autoincrement().primaryKey(),
    materialId: int("material_id").notNull(),
    
    // ASTM Standards (JSON array)
    astmCodes: json("astm_codes").$type<string[]>().default([]),
    
    // Fire & Safety Certifications
    ulListing: varchar("ul_listing", { length: 255 }),
    ulDesignNumber: varchar("ul_design_number", { length: 50 }),
    iccEsReport: varchar("icc_es_report", { length: 50 }),
    fireRating: varchar("fire_rating", { length: 50 }),
    fireRatingStandard: varchar("fire_rating_standard", { length: 100 }),
    charRate: varchar("char_rate", { length: 50 }),
    
    // Structural Performance
    compressiveStrengthPsi: int("compressive_strength_psi"),
    modulusOfElasticityKsi: int("modulus_of_elasticity_ksi"),
    flexuralStrengthPsi: int("flexural_strength_psi"),
    tensileStrengthPsi: int("tensile_strength_psi"),
    stiffnessKsi: int("stiffness_ksi"),
    
    // Thermal Performance
    rValuePerInch: decimal("r_value_per_inch", { precision: 5, scale: 2 }),
    lttr15Year: decimal("lttr_15_year", { precision: 5, scale: 2 }),
    permRating: decimal("perm_rating", { precision: 5, scale: 2 }),
    thermalUValue: decimal("thermal_u_value", { precision: 8, scale: 4 }),
    
    // Acoustic Performance
    stcRating: int("stc_rating"),
    iicRating: int("iic_rating"),
    nrcRating: decimal("nrc_rating", { precision: 3, scale: 2 }),
    
    // Installability & Labor
    laborUnits: decimal("labor_units", { precision: 5, scale: 2 }),
    cureTimeHours: int("cure_time_hours"),
    weightPerUnit: decimal("weight_per_unit", { precision: 8, scale: 2 }),
    slumpWorkability: varchar("slump_workability", { length: 50 }),
    installationDifficulty: int("installation_difficulty"),
    
    // Reliability & Supply Chain
    leadTimeDays: int("lead_time_days"),
    otifPercentage: decimal("otif_percentage", { precision: 5, scale: 2 }),
    supplierZScore: decimal("supplier_z_score", { precision: 5, scale: 2 }),
    
    // Lifecycle & Maintenance
    warrantyYears: int("warranty_years"),
    maintenanceCycleYears: int("maintenance_cycle_years"),
    expectedLifespanYears: int("expected_lifespan_years"),
    
    // Metadata
    dataSource: varchar("data_source", { length: 100 }),
    dataConfidence: int("data_confidence").default(50),
    lastVerifiedAt: timestamp("last_verified_at"),
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

/**
 * Regional Pricing Data
 * Stores pricing from DOT bid tabs, Craftsman, RSMeans, Home Depot
 */
export const pricingData = mysqlTable(
  "pricing_data",
  {
    id: int("id").autoincrement().primaryKey(),
    materialId: int("material_id").notNull(),
    
    // Pricing
    pricePerUnit: decimal("price_per_unit", { precision: 10, scale: 2 }).notNull(),
    unit: varchar("unit", { length: 50 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("USD"),
    
    // Regional Context
    state: varchar("state", { length: 2 }),
    city: varchar("city", { length: 100 }),
    zipCode: varchar("zip_code", { length: 10 }),
    county: varchar("county", { length: 100 }),
    
    // Data Source
    source: varchar("source", { length: 50 }).notNull(),
    sourceDate: timestamp("source_date"),
    sourceUrl: text("source_url"),
    projectName: varchar("project_name", { length: 255 }),
    contractNumber: varchar("contract_number", { length: 100 }),
    
    // Labor Pricing
    laborRatePerHour: decimal("labor_rate_per_hour", { precision: 8, scale: 2 }),
    totalLaborCost: decimal("total_labor_cost", { precision: 10, scale: 2 }),
    
    // Metadata
    dataConfidence: int("data_confidence").default(50),
    isActive: boolean("is_active").default(true),
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

/**
 * Swap Validations
 * Tracks validation results with showstopper checks and CSI form URLs
 */
export const swapValidations = mysqlTable(
  "swap_validations",
  {
    id: int("id").autoincrement().primaryKey(),
    
    // Materials
    incumbentMaterialId: int("incumbent_material_id").notNull(),
    sustainableMaterialId: int("sustainable_material_id").notNull(),
    
    // Validation Results
    isValidSwap: boolean("is_valid_swap").notNull(),
    validationStatus: mysqlEnum("validation_status", ["APPROVED", "EXPERIMENTAL", "REJECTED"]).notNull(),
    
    // Showstopper Checks
    astmMatch: boolean("astm_match").notNull(),
    fireRatingMatch: boolean("fire_rating_match").notNull(),
    ulListingMatch: boolean("ul_listing_match").notNull(),
    strengthAdequate: boolean("strength_adequate").notNull(),
    rValueAdequate: boolean("r_value_adequate").notNull(),
    stcAdequate: boolean("stc_adequate").notNull(),
    
    // Warnings (JSON array)
    warnings: json("warnings").$type<string[]>().default([]),
    
    // Cost Comparison
    incumbentTotalCost: decimal("incumbent_total_cost", { precision: 10, scale: 2 }),
    sustainableTotalCost: decimal("sustainable_total_cost", { precision: 10, scale: 2 }),
    costDeltaPercentage: decimal("cost_delta_percentage", { precision: 5, scale: 2 }),
    
    // Carbon Comparison
    incumbentGwp: decimal("incumbent_gwp", { precision: 10, scale: 2 }),
    sustainableGwp: decimal("sustainable_gwp", { precision: 10, scale: 2 }),
    carbonReductionPercentage: decimal("carbon_reduction_percentage", { precision: 5, scale: 2 }),
    
    // Project Context
    projectState: varchar("project_state", { length: 2 }),
    projectCity: varchar("project_city", { length: 100 }),
    projectType: varchar("project_type", { length: 100 }),
    
    // Generated Documentation
    csiFormUrl: text("csi_form_url"),
    csiFormGeneratedAt: timestamp("csi_form_generated_at"),
    
    // User Tracking
    requestedBy: int("requested_by"),
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

/**
 * Material Assembly Specifications
 * Assembly-level specs with UL design numbers
 */
export const materialAssemblySpecs = mysqlTable(
  "material_assembly_specs",
  {
    id: int("id").autoincrement().primaryKey(),
    
    // Assembly Identity
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    description: text("description"),
    
    // Assembly-Level Specs
    totalThicknessInches: decimal("total_thickness_inches", { precision: 5, scale: 2 }),
    totalRValue: decimal("total_r_value", { precision: 5, scale: 2 }),
    fireRating: varchar("fire_rating", { length: 50 }),
    ulDesignNumber: varchar("ul_design_number", { length: 50 }),
    stcRating: int("stc_rating"),
    iicRating: int("iic_rating"),
    
    // Cost & Carbon
    totalCostPerSf: decimal("total_cost_per_sf", { precision: 10, scale: 2 }),
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

/**
 * Assembly Spec Components
 * Links materials to assembly specs with layer order
 */
export const assemblySpecComponents = mysqlTable(
  "assembly_spec_components",
  {
    id: int("id").autoincrement().primaryKey(),
    assemblySpecId: int("assembly_spec_id").notNull(),
    materialId: int("material_id").notNull(),
    layerOrder: int("layer_order").notNull(),
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
