/**
 * GreenChainz research module — canonical data imports.
 *
 * Any feature, router, scraper, or agent that needs to reason about
 * decision-makers, supplier categories, or sales strategy should import
 * from this index rather than re-defining shapes.
 *
 * Source of truth docs:
 *   docs/research/README.md
 *   docs/research/PROCUREMENT_DECISION_MAKERS.md
 *   docs/research/SUPPLIER_ECOSYSTEM.md
 *   docs/research/SALES_PSYCHOLOGY.md
 */

export * from "./decisionMakers";
export * from "./supplierCategories";
export * from "./salesPsychology";
