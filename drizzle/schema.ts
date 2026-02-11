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
