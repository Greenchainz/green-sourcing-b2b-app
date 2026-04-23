# GreenChainz Research — Canonical Reference

> **PRE-READ REQUIRED** for anyone (human or AI) touching:
> supplier onboarding, architect UX, SWAP engine, Material Credit Score,
> Interceptor logic, Forma/Revit extensions, scraper output schemas,
> outreach copy, or marketplace matching.

This folder is the authoritative, machine-readable source of GreenChainz's
domain research. It condenses three deep-research reports into structured
docs and typed data modules so every feature and every AI session operates
from the same facts.

---

## The Three Source Documents

| # | Title | Status | Canonical Doc | Typed Module |
|---|-------|--------|---------------|--------------|
| 1 | Sustainable Material Decision-Makers Identified | Distilled | [`PROCUREMENT_DECISION_MAKERS.md`](./PROCUREMENT_DECISION_MAKERS.md) | [`lib/research/decisionMakers.ts`](../../lib/research/decisionMakers.ts) |
| 2 | Sustainable Material Supplier Ecosystem Analysis | Distilled | [`SUPPLIER_ECOSYSTEM.md`](./SUPPLIER_ECOSYSTEM.md) | [`lib/research/supplierCategories.ts`](../../lib/research/supplierCategories.ts) |
| 3 | The Anatomy of Strategic Procurement (image-only PDF; exec overview duplicates #1) | Cross-referenced in #1 | — | — |

Plus: [`SALES_PSYCHOLOGY.md`](./SALES_PSYCHOLOGY.md) — the four supplier-side
sales frameworks (Trojan Horse, Interceptor, Tiered Membership, Hard Sell)
extracted from Part VII of the Ecosystem report.

Typed module: [`lib/research/salesPsychology.ts`](../../lib/research/salesPsychology.ts)

---

## What To Use This For

### If you're building a feature
- **Supplier onboarding forms** — every required field should map to a
  `MaterialReadiness` signal or a `CertificationStatus` slot. See
  `lib/research/supplierCategories.ts`.
- **Architect search / SWAP UI** — every filter and sort order should trace
  back to a `DecisionMakerTier` pain point. See
  `lib/research/decisionMakers.ts`.
- **Interceptor (Forma/Revit)** — the trigger grammar is defined in
  `lib/research/salesPsychology.ts` (`InterceptorTrigger`). Do not invent
  new shapes.
- **Material Credit Score** — the scoring inputs (`verified`, `epdStatus`,
  `specificationCount`, `costPremium`) are locked in
  `lib/research/salesPsychology.ts`. Extend the type, don't parallel-invent.

### If you're writing outreach
- Supplier cold outreach: start from the pitch angle in
  `SUPPLIER_ECOSYSTEM.md` for that company's category. Never write generic
  sustainability platitudes.
- Architect outreach: start from the pain point + hook in
  `PROCUREMENT_DECISION_MAKERS.md` for the target role.
- Investor / partnership pitch: use the direct quotes at the bottom of each
  doc verbatim — they came from the research, not us.

### If you're running a scraper / hunter agent
The existing scraper architecture already lives at:
- [`docs/PERSONA_SCRAPER_ARCHITECTURE.md`](../PERSONA_SCRAPER_ARCHITECTURE.md)
- [`docs/HUNTER_AGENTS_ARCHITECTURE.md`](../HUNTER_AGENTS_ARCHITECTURE.md)
- [`docs/DECISION_LOGIC_EXTRACTION.md`](../DECISION_LOGIC_EXTRACTION.md)

Those are the runtime docs. **This folder is what they should be scoring
their output against.** Every scraped person should resolve to a
`DecisionMakerTier`. Every scraped company should resolve to a
`SupplierCategory` + `MaterialReadiness` level.

---

## How To Keep This Accurate

1. **Don't edit distilled docs freely.** If the source research changes
   (new report, updated company, new role), update the distilled doc AND
   the typed module in the same PR.
2. **New companies** go in `SUPPLIER_ECOSYSTEM.md` AND
   `lib/research/supplierCategories.ts`. Pick the right category letter.
3. **New roles** go in `PROCUREMENT_DECISION_MAKERS.md` AND
   `lib/research/decisionMakers.ts`. Pick the right tier.
4. **New sales frameworks** are rare. Discuss before adding.
5. **Direct quotes are load-bearing.** Don't paraphrase them. They're the
   spirit of what we're building.

---

## Money Lane — Why This Exists

GreenChainz is not a sustainability non-profit. We are a two-sided
marketplace with one revenue-generating interaction: a verified supplier
wins a spec they otherwise would not have won. Everything in this folder
exists to make that interaction happen more often.

- **Supplier side:** "The cost of not being on this platform is invisibility
  in the age of carbon regulation." (Ecosystem report, Part VII)
- **Architect side:** "The Spec Writer determines the rigidity of the
  procurement process. If a Spec Writer includes a 'No Substitution' clause
  for a specific sustainable product, the contractor must buy it."
  (Decision-Makers report, Part I)

Build toward those two truths or you're building something else.
