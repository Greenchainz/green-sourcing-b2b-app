/**
 * Drizzle additions for migration 0030: Material Credit Score v2.
 *
 * Pattern follows drizzle/schema-additions-swap-engine.ts — append-only
 * additions consumed alongside the main schema.ts. Column renames inside
 * the existing `suppliers` and `epd_materials` tables are documented at
 * the bottom of this file; copy them into schema.ts when convenient.
 */

import {
  pgTable, pgEnum, serial, integer, varchar, text, decimal, boolean,
  timestamp, date, jsonb, index, unique,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const architectPersonaEnum = pgEnum("architect_persona", [
  "aor", "leed_ap", "gc_pm", "spec_writer", "interior_designer",
]);

export const specParseStatusEnum = pgEnum("spec_parse_status", [
  "pending", "processing", "ready", "failed",
]);

export const rfqEventTypeEnum = pgEnum("rfq_event_type", [
  "viewed", "responded", "declined", "completed", "expired",
]);

export const leadCreditReasonEnum = pgEnum("lead_credit_reason", [
  "monthly_grant",
  "tier_upgrade_bonus",
  "referral_bonus",
  "rfq_unlock",
  "architect_contact_unlock",
  "admin_adjustment",
  "company_of_week_bonus",
  "top_responder_bonus",
]);

// ─── Material Credit Score cache ──────────────────────────────────────────────

export const materialCreditScores = pgTable(
  "material_credit_scores",
  {
    id: serial("id").primaryKey(),
    epdMaterialId: integer("epd_material_id").notNull(),
    persona: architectPersonaEnum("persona").notNull().default("aor"),

    gcs: integer("gcs").notNull(),
    sustainabilityScore: integer("sustainability_score").notNull(),
    performanceScore: integer("performance_score").notNull(),

    carbonScore: integer("carbon_score").notNull(),
    certScore: integer("cert_score").notNull(),
    recycledScore: integer("recycled_score").notNull(),
    regionalScore: integer("regional_score").notNull(),

    complianceScore: integer("compliance_score").notNull(),
    costScore: integer("cost_score").notNull(),
    availabilityScore: integer("availability_score").notNull(),
    healthScore: integer("health_score").notNull(),

    carbonSavingsPct: decimal("carbon_savings_pct", { precision: 6, scale: 2 }),
    costDeltaPct: decimal("cost_delta_pct", { precision: 6, scale: 2 }),
    leadTimeWeeks: decimal("lead_time_weeks", { precision: 5, scale: 1 }),
    complianceStatus: jsonb("compliance_status").$type<Record<string, boolean>>(),

    baselineGwp: decimal("baseline_gwp", { precision: 14, scale: 4 }),
    categoryAvgPrice: decimal("category_avg_price", { precision: 12, scale: 4 }),

    calculatedAt: timestamp("calculated_at").notNull().defaultNow(),
    algorithmVersion: varchar("algorithm_version", { length: 20 }).notNull().default("2.0"),
  },
  (t) => ({
    unq: unique("material_credit_scores_unique").on(t.epdMaterialId, t.persona, t.algorithmVersion),
    epdIdx: index("idx_mcs_epd").on(t.epdMaterialId),
    gcsIdx: index("idx_mcs_gcs").on(t.gcs),
    personaIdx: index("idx_mcs_persona").on(t.persona),
  }),
);

export type MaterialCreditScore = typeof materialCreditScores.$inferSelect;
export type InsertMaterialCreditScore = typeof materialCreditScores.$inferInsert;

// ─── Supplier Reliability Score history ───────────────────────────────────────

export const supplierReliabilityHistory = pgTable(
  "supplier_reliability_history",
  {
    id: serial("id").primaryKey(),
    supplierId: integer("supplier_id").notNull(),
    srs: integer("srs").notNull(),
    responseScore: integer("response_score").notNull(),
    completionScore: integer("completion_score").notNull(),
    verificationScore: integer("verification_score").notNull(),
    reviewScore: integer("review_score").notNull(),
    dataScore: integer("data_score").notNull(),
    speedBonus: integer("speed_bonus").notNull().default(0),
    dunsBonus: integer("duns_bonus").notNull().default(0),
    inputs: jsonb("inputs"),
    calculatedAt: timestamp("calculated_at").notNull().defaultNow(),
  },
  (t) => ({
    supplierIdx: index("idx_srs_hist_supplier").on(t.supplierId, t.calculatedAt),
  }),
);

export type SupplierReliabilityHistory = typeof supplierReliabilityHistory.$inferSelect;

// ─── RFQ response events (drives SRS response_score) ──────────────────────────

export const rfqResponseEvents = pgTable(
  "rfq_response_events",
  {
    id: serial("id").primaryKey(),
    rfqId: integer("rfq_id").notNull(),
    supplierId: integer("supplier_id").notNull(),
    eventType: rfqEventTypeEnum("event_type").notNull(),
    responseTimeHours: decimal("response_time_hours", { precision: 10, scale: 2 }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    supplierIdx: index("idx_rfq_events_supplier").on(t.supplierId, t.createdAt),
    rfqIdx: index("idx_rfq_events_rfq").on(t.rfqId),
  }),
);

export type RfqResponseEvent = typeof rfqResponseEvents.$inferSelect;
export type InsertRfqResponseEvent = typeof rfqResponseEvents.$inferInsert;

// ─── Lead credit ledger ───────────────────────────────────────────────────────

export const leadCreditLedger = pgTable(
  "lead_credit_ledger",
  {
    id: serial("id").primaryKey(),
    supplierId: integer("supplier_id").notNull(),
    delta: integer("delta").notNull(),
    reason: leadCreditReasonEnum("reason").notNull(),
    relatedRfqId: integer("related_rfq_id"),
    relatedUserId: integer("related_user_id"),
    balanceAfter: integer("balance_after").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    supplierIdx: index("idx_lcl_supplier").on(t.supplierId, t.createdAt),
    reasonIdx: index("idx_lcl_reason").on(t.reason),
  }),
);

export type LeadCreditLedger = typeof leadCreditLedger.$inferSelect;
export type InsertLeadCreditLedger = typeof leadCreditLedger.$inferInsert;

// ─── Featured suppliers (Company of the Week) ─────────────────────────────────

export const featuredSuppliers = pgTable(
  "featured_suppliers",
  {
    id: serial("id").primaryKey(),
    supplierId: integer("supplier_id").notNull(),
    weekStart: date("week_start").notNull(),
    weekEnd: date("week_end").notNull(),
    headline: varchar("headline", { length: 255 }),
    blurb: text("blurb"),
    heroImageUrl: text("hero_image_url"),
    featuredMetrics: jsonb("featured_metrics").$type<{
      gcs?: number; srs?: number; projects?: number; carbonSavedTons?: number;
    }>(),
    linkedinPostUrl: text("linkedin_post_url"),
    emailBlastSentAt: timestamp("email_blast_sent_at"),
    views: integer("views").notNull().default(0),
    rfqsGenerated: integer("rfqs_generated").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    weekUnq: unique("featured_suppliers_week_unique").on(t.weekStart),
    supplierIdx: index("idx_featured_supplier").on(t.supplierId),
    weekIdx: index("idx_featured_week").on(t.weekStart),
  }),
);

export type FeaturedSupplier = typeof featuredSuppliers.$inferSelect;
export type InsertFeaturedSupplier = typeof featuredSuppliers.$inferInsert;

// ─── Architect uploaded specs (PDF/Excel via Azure Document Intelligence) ─────

export const architectUploadedSpecs = pgTable(
  "architect_uploaded_specs",
  {
    id: serial("id").primaryKey(),
    architectId: integer("architect_id").notNull(),
    originalFilename: varchar("original_filename", { length: 500 }).notNull(),
    blobUrl: text("blob_url").notNull(),
    mimeType: varchar("mime_type", { length: 100 }),
    fileSizeBytes: integer("file_size_bytes"),
    parseStatus: specParseStatusEnum("parse_status").notNull().default("pending"),
    parseStartedAt: timestamp("parse_started_at"),
    parseCompletedAt: timestamp("parse_completed_at"),
    totalPages: integer("total_pages"),
    totalAssemblies: integer("total_assemblies").notNull().default(0),
    rawExtraction: jsonb("raw_extraction"),
    errorMessage: text("error_message"),
    projectName: varchar("project_name", { length: 255 }),
    projectLocation: varchar("project_location", { length: 255 }),
    estimatedValue: decimal("estimated_value", { precision: 14, scale: 2 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    architectIdx: index("idx_uploaded_specs_architect").on(t.architectId),
    statusIdx: index("idx_uploaded_specs_status").on(t.parseStatus),
  }),
);

export type ArchitectUploadedSpec = typeof architectUploadedSpecs.$inferSelect;
export type InsertArchitectUploadedSpec = typeof architectUploadedSpecs.$inferInsert;

// ─── Architect spec assemblies (parsed rows) ──────────────────────────────────

export const architectSpecAssemblies = pgTable(
  "architect_spec_assemblies",
  {
    id: serial("id").primaryKey(),
    specId: integer("spec_id").notNull(),
    assemblyCode: varchar("assembly_code", { length: 20 }),
    assemblyName: varchar("assembly_name", { length: 255 }),
    description: text("description"),
    assemblyType: varchar("assembly_type", { length: 120 }),
    structuralOption: integer("structural_option"),
    declaredUnit: varchar("declared_unit", { length: 100 }),
    gwpValue: decimal("gwp_value", { precision: 14, scale: 4 }),
    gwp: decimal("gwp", { precision: 14, scale: 4 }),
    gwpUnit: varchar("gwp_unit", { length: 50 }),
    gwpPer1000sf: decimal("gwp_per_1000sf", { precision: 14, scale: 4 }),
    quantity: varchar("quantity", { length: 100 }),
    manufacturerHint: varchar("manufacturer_hint", { length: 255 }),
    productHint: varchar("product_hint", { length: 255 }),
    pageNumber: integer("page_number"),
    lineNumber: integer("line_number"),
    rawRow: jsonb("raw_row"),
    matchedEpdMaterialId: integer("matched_epd_material_id"),
    matchConfidence: decimal("match_confidence", { precision: 4, scale: 3 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    specIdx: index("idx_spec_asm_spec").on(t.specId),
    codeIdx: index("idx_spec_asm_code").on(t.assemblyCode),
    matchIdx: index("idx_spec_asm_match").on(t.matchedEpdMaterialId),
  }),
);

export type ArchitectSpecAssembly = typeof architectSpecAssemblies.$inferSelect;
export type InsertArchitectSpecAssembly = typeof architectSpecAssemblies.$inferInsert;

// ─── Generated RFQs (output of architect spec → RFQ pipeline) ─────────────────

export const generatedRfqs = pgTable(
  "generated_rfqs",
  {
    id: serial("id").primaryKey(),
    specId: integer("spec_id").notNull(),
    rfqId: integer("rfq_id").notNull(),
    generatedFormat: varchar("generated_format", { length: 20 }).notNull(),
    outputBlobUrl: text("output_blob_url"),
    alternativeCount: integer("alternative_count").notNull().default(0),
    totalCarbonSavingsPct: decimal("total_carbon_savings_pct", { precision: 6, scale: 2 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    specIdx: index("idx_generated_rfq_spec").on(t.specId),
    rfqIdx: index("idx_generated_rfq_rfq").on(t.rfqId),
  }),
);

export type GeneratedRfq = typeof generatedRfqs.$inferSelect;
export type InsertGeneratedRfq = typeof generatedRfqs.$inferInsert;

// ─── Tier pricing reference ───────────────────────────────────────────────────

export const supplierTierPricing = pgTable("supplier_tier_pricing", {
  // PK is the tier enum value
  tier: varchar("tier", { length: 20 }).primaryKey(),
  monthlyPriceUsd: integer("monthly_price_usd").notNull(),
  rfqVisibilityDelayHours: integer("rfq_visibility_delay_hours").notNull(),
  monthlyLeadCredits: integer("monthly_lead_credits").notNull(),
  features: jsonb("features").notNull(),
  msPlanId: varchar("ms_plan_id", { length: 255 }),
});

export type SupplierTierPricing = typeof supplierTierPricing.$inferSelect;

/* ─────────────────────────────────────────────────────────────────────────────
 * COLUMNS ADDED TO EXISTING TABLES (for reference — copy into schema.ts when
 * ready to consolidate. The SQL migration handles the actual DDL.):
 *
 * suppliers:
 *   tier                          supplier_tier   default 'free'   NOT NULL
 *   tier_updated_at               timestamp
 *   lead_credits                  integer         default 0        NOT NULL
 *   monthly_lead_credit_allowance integer         default 0        NOT NULL
 *   last_lead_credit_reset_at     timestamp
 *   duns_number                   varchar(20)
 *   duns_score                    integer
 *   duns_verified_at              timestamp
 *   linkedin_url                  varchar(500)
 *   linkedin_verified             boolean         default false    NOT NULL
 *   business_license_verified     boolean         default false    NOT NULL
 *   avg_response_time_hours       decimal(10,2)
 *   rfq_completion_rate           decimal(5,4)
 *   avg_rating                    decimal(3,2)
 *   rating_count                  integer         default 0        NOT NULL
 *   data_completeness_pct         decimal(5,4)
 *   srs_score                     integer
 *   srs_calculated_at             timestamp
 *   top_responder_badge           boolean         default false    NOT NULL
 *   lightning_fast_badge          boolean         default false    NOT NULL
 *   territory_exclusive_metro     varchar(100)
 *   featured_company_of_week_at   timestamp
 *   hidden_from_search            boolean         default false    NOT NULL
 *
 * epd_materials:
 *   epd_expiry, epd_program_operator, interior_exterior, r_value, fire_rating,
 *   astm_standards (jsonb), msf_factor, title24_compliant, iecc_compliant,
 *   fire_rating_documented, voc_compliant, not_on_red_list, hpd_available,
 *   c2c_certified, fsc_certified, greenguard_gold, declare_label,
 *   recycled_content_pct, regional_availability (jsonb), regional_within_500mi,
 *   lead_time_days, price_per_unit, price_unit, take_back_program,
 *   min_order_quantity, leed_credits (jsonb)
 * ───────────────────────────────────────────────────────────────────────────── */
