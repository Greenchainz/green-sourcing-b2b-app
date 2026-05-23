/**
 * Smart RFx Classifier
 *
 * Deterministic intent classifier — turns a buyer's free-text material need
 * into a recommended request type (RFI / RFQ / RFP / Qualification / etc.)
 * with confidence, reason, and a pre-populated supplier response field list.
 *
 * Pure function — no DB, no LLM on the critical path. Replace/augment with
 * Azure OpenAI later by wrapping `recommendRequestType` and falling back here.
 */

// ─── Request type enum ────────────────────────────────────────────────────────

export const REQUEST_TYPES = [
  "rfi",
  "rfq_quote",
  "rfp",
  "supplier_qualification",
  "alternative_material",
  "submittal_documentation",
  "bid_package",
] as const;

export type RequestType = (typeof REQUEST_TYPES)[number];

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  rfi:                     "RFI — Request for Information",
  rfq_quote:               "RFQ — Request for Quote",
  rfp:                     "RFP — Request for Proposal",
  supplier_qualification:  "Supplier Qualification Request",
  alternative_material:    "Alternative Material Request",
  submittal_documentation: "Submittal Documentation Request",
  bid_package:             "Bid Package",
};

export const REQUEST_TYPE_DESCRIPTIONS: Record<RequestType, string> = {
  rfi:                     "Use when you need information, documentation, EPDs, or certifications from suppliers before issuing a formal request.",
  rfq_quote:               "Use when material requirements are defined and you need pricing, lead time, and sustainability documentation.",
  rfp:                     "Use when you need suppliers to propose a full solution, approach, or design-assist package.",
  supplier_qualification:  "Use to evaluate supplier credentials, capacity, certifications, compliance, and references.",
  alternative_material:    "Use when you need a lower-carbon substitute or equivalent material with verified EPDs.",
  submittal_documentation: "Use to collect product data sheets, EPDs, LEED documentation, and installation specs.",
  bid_package:             "Use for competitive bidding on a defined scope with full commercial and technical requirements.",
};

// ─── Supplier response field model ───────────────────────────────────────────

export type SupplierResponseFieldType =
  | "text"
  | "number"
  | "currency"
  | "date"
  | "boolean"
  | "file"
  | "url"
  | "select";

export type SupplierResponseFieldCategory =
  | "commercial"
  | "sustainability"
  | "logistics"
  | "qualification"
  | "documentation"
  | "technical";

export interface SupplierResponseField {
  key: string;
  label: string;
  fieldType: SupplierResponseFieldType;
  required: boolean;
  category: SupplierResponseFieldCategory;
  helpText?: string;
}

// ─── Default field sets ───────────────────────────────────────────────────────

const commercialFields: SupplierResponseField[] = [
  { key: "can_fulfill",           label: "Can you fulfill this request?", fieldType: "boolean",  required: true,  category: "commercial", helpText: "Indicate yes/no before completing the form" },
  { key: "unit_price",            label: "Unit price",                    fieldType: "currency", required: true,  category: "commercial" },
  { key: "available_quantity",    label: "Available quantity",            fieldType: "number",   required: false, category: "commercial" },
  { key: "minimum_order_qty",     label: "Minimum order quantity",        fieldType: "number",   required: false, category: "commercial" },
  { key: "payment_terms",         label: "Payment terms",                 fieldType: "text",     required: false, category: "commercial", helpText: "e.g. Net 30, 50% upfront" },
  { key: "quote_expiration_date", label: "Quote expiration date",         fieldType: "date",     required: true,  category: "commercial" },
];

const sustainabilityFields: SupplierResponseField[] = [
  { key: "epd_available",   label: "EPD available",                  fieldType: "boolean", required: true,  category: "sustainability" },
  { key: "epd_reference",   label: "EPD reference or upload",        fieldType: "file",    required: false, category: "documentation", helpText: "Upload PDF or paste EPD number/URL" },
  { key: "gwp_value",       label: "GWP (kgCO₂e per declared unit)", fieldType: "number",  required: false, category: "sustainability", helpText: "Global Warming Potential — A1-A3 lifecycle stage" },
  { key: "epd_type",        label: "EPD type",                       fieldType: "select",  required: false, category: "sustainability", helpText: "Product-specific, Industry Average, or Verified" },
  { key: "leed_credit",     label: "LEED MR credit contribution",    fieldType: "text",    required: false, category: "sustainability", helpText: "e.g. MR Credit: Building Product Disclosure" },
  { key: "buy_clean",       label: "Buy Clean compliant",            fieldType: "boolean", required: false, category: "sustainability" },
  { key: "certifications",  label: "Certifications",                 fieldType: "text",    required: false, category: "sustainability", helpText: "e.g. ISO 14001, LEED, Declare, Cradle to Cradle" },
];

const logisticsFields: SupplierResponseField[] = [
  { key: "lead_time_days",   label: "Lead time (days)",      fieldType: "number", required: true,  category: "logistics" },
  { key: "delivery_region",  label: "Delivery region",       fieldType: "text",   required: true,  category: "logistics", helpText: "States or radius served" },
  { key: "freight_estimate", label: "Freight estimate",      fieldType: "currency",required: false, category: "logistics" },
  { key: "service_radius",   label: "Service radius (miles)",fieldType: "number", required: false, category: "logistics" },
];

const qualificationFields: SupplierResponseField[] = [
  { key: "years_in_business",   label: "Years in business",       fieldType: "number", required: false, category: "qualification" },
  { key: "project_references",  label: "Project references",      fieldType: "text",   required: false, category: "qualification" },
  { key: "insurance_docs",      label: "Insurance documentation", fieldType: "file",   required: false, category: "qualification" },
  { key: "bonding_capacity",    label: "Bonding capacity ($)",    fieldType: "currency",required: false, category: "qualification" },
  { key: "safety_record",       label: "Safety record / EMR",     fieldType: "text",   required: false, category: "qualification" },
];

const technicalFields: SupplierResponseField[] = [
  { key: "product_data_sheet", label: "Product data sheet",      fieldType: "file", required: false, category: "documentation" },
  { key: "technical_specs",    label: "Technical specifications", fieldType: "file", required: false, category: "technical" },
  { key: "proposed_alternative",label: "Proposed alternative",   fieldType: "text", required: false, category: "technical", helpText: "Describe the alternative if substituting a specified product" },
];

export const DEFAULT_FIELDS: Record<RequestType, SupplierResponseField[]> = {
  rfq_quote: [
    ...commercialFields,
    ...sustainabilityFields,
    ...logisticsFields,
  ],
  rfi: [
    { key: "can_fulfill",      label: "Can you fulfill this request?", fieldType: "boolean", required: true,  category: "commercial" },
    ...sustainabilityFields,
    { key: "product_data_sheet", label: "Product data sheet", fieldType: "file", required: false, category: "documentation" },
  ],
  rfp: [
    ...commercialFields,
    ...sustainabilityFields,
    ...logisticsFields,
    { key: "proposed_approach", label: "Proposed approach / solution", fieldType: "text", required: true,  category: "technical" },
    { key: "design_assist",     label: "Design assist available",      fieldType: "boolean", required: false, category: "technical" },
    ...technicalFields,
  ],
  supplier_qualification: [
    { key: "can_fulfill",  label: "Can you fulfill this request?", fieldType: "boolean", required: true, category: "commercial" },
    ...qualificationFields,
    ...sustainabilityFields.filter((f) => f.key === "certifications"),
  ],
  alternative_material: [
    { key: "can_fulfill",        label: "Can you provide a compliant alternative?", fieldType: "boolean", required: true,  category: "commercial" },
    ...commercialFields.filter((f) => ["unit_price", "quote_expiration_date"].includes(f.key)),
    ...sustainabilityFields,
    ...logisticsFields.filter((f) => ["lead_time_days", "delivery_region"].includes(f.key)),
    { key: "proposed_alternative", label: "Proposed alternative product / spec", fieldType: "text", required: true, category: "technical" },
    { key: "equivalency_proof",    label: "Equivalency documentation",            fieldType: "file", required: false, category: "documentation" },
  ],
  submittal_documentation: [
    { key: "can_fulfill",        label: "Can you provide the documentation?",    fieldType: "boolean", required: true,  category: "commercial" },
    ...sustainabilityFields,
    { key: "product_data_sheet", label: "Product data sheet",                    fieldType: "file",    required: true,  category: "documentation" },
    { key: "installation_guide", label: "Installation guide",                    fieldType: "file",    required: false, category: "documentation" },
    { key: "warranty_docs",      label: "Warranty documentation",                fieldType: "file",    required: false, category: "documentation" },
    { key: "leed_letter_template",label: "LEED letter template",                 fieldType: "file",    required: false, category: "documentation" },
  ],
  bid_package: [
    ...commercialFields,
    ...sustainabilityFields,
    ...logisticsFields,
    ...qualificationFields,
    ...technicalFields,
  ],
};

// ─── Classifier ───────────────────────────────────────────────────────────────

export interface SmartRfxRecommendation {
  requestType: RequestType;
  confidence: number;  // 0–1
  reason: string;
  suggestedFields: SupplierResponseField[];
}

export function recommendRequestType(description: string): SmartRfxRecommendation {
  const text = description.toLowerCase();

  const wantsPricing =
    /\b(price|pricing|quote|cost|unit price|freight|delivery|lead.?time|availability|how much|rate|bid)\b/.test(text);

  const wantsInfo =
    /\b(information|info|epd|certification|leed|buy.?clean|documentation|doc|clarif|available|data|spec|technical)\b/.test(text);

  const wantsProposal =
    /\b(proposal|solution|approach|package|system|recommend|alternative.?approach|design.?assist|rfp|design.?build|full.?service)\b/.test(text);

  const wantsQualification =
    /\b(qualification|qualify|credentials|insurance|capacity|references|compliance|certified.?supplier|prequalif|prequalification|background|vetting|bonding)\b/.test(text);

  const wantsAlternative =
    /\b(alternative|substitute|replacement|lower.?carbon|low.?carbon|equivalent|swap|instead|instead of|comparable)\b/.test(text);

  const wantsSubmittal =
    /\b(submittal|data.?sheet|product.?data|cut.?sheet|installation|warranty|leed.?letter|close.?out)\b/.test(text);

  const wantsBidPackage =
    /\b(bid.?package|invitation.?to.?bid|itb|competitive.?bid|bid.?leveling|sealed.?bid)\b/.test(text);

  // Priority order: most specific first
  if (wantsBidPackage) {
    return {
      requestType: "bid_package",
      confidence: 0.88,
      reason: "Your request references a competitive bid or bid package structure.",
      suggestedFields: DEFAULT_FIELDS.bid_package,
    };
  }

  if (wantsQualification) {
    return {
      requestType: "supplier_qualification",
      confidence: 0.86,
      reason: "Your request focuses on supplier credentials, compliance, capacity, or eligibility rather than pricing.",
      suggestedFields: DEFAULT_FIELDS.supplier_qualification,
    };
  }

  if (wantsProposal) {
    return {
      requestType: "rfp",
      confidence: 0.83,
      reason: "Your request asks suppliers to propose a solution or approach, not just provide pricing.",
      suggestedFields: DEFAULT_FIELDS.rfp,
    };
  }

  if (wantsSubmittal) {
    return {
      requestType: "submittal_documentation",
      confidence: 0.84,
      reason: "Your request focuses on submittals, product data sheets, EPDs, or close-out documentation.",
      suggestedFields: DEFAULT_FIELDS.submittal_documentation,
    };
  }

  if (wantsAlternative) {
    return {
      requestType: "alternative_material",
      confidence: 0.81,
      reason: "Your request is looking for a lower-carbon substitute or equivalent material option.",
      suggestedFields: DEFAULT_FIELDS.alternative_material,
    };
  }

  if (wantsPricing && wantsInfo) {
    return {
      requestType: "rfq_quote",
      confidence: 0.91,
      reason: "Your request defines a material need and asks for pricing, lead time, availability, and sustainability documentation — the classic RFQ.",
      suggestedFields: DEFAULT_FIELDS.rfq_quote,
    };
  }

  if (wantsPricing) {
    return {
      requestType: "rfq_quote",
      confidence: 0.84,
      reason: "Your request asks for pricing, delivery, or commercial terms for a defined material.",
      suggestedFields: DEFAULT_FIELDS.rfq_quote,
    };
  }

  if (wantsInfo) {
    return {
      requestType: "rfi",
      confidence: 0.78,
      reason: "Your request appears exploratory — gathering information, EPDs, or certifications before issuing a formal quote request.",
      suggestedFields: DEFAULT_FIELDS.rfi,
    };
  }

  // Default: RFI
  return {
    requestType: "rfi",
    confidence: 0.62,
    reason: "Your request doesn't clearly specify pricing or qualification criteria — starting with an RFI lets you gather information before committing to a formal request type.",
    suggestedFields: DEFAULT_FIELDS.rfi,
  };
}
