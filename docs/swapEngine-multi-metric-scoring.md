# SWAP Engine + Multi-Metric RFQ Matching with Location Tracking

> Status: **APPROVED — execution sprint plan**
> Owner: Jerit
> Feature flag: `FEATURE_COMPOSITE_SCORING`
> Money lane: **YES** — this *is* the moat.

---

## Strategic bet

The moat is **SWAP Engine + RFQ + location tracking + composite multi-metric scoring**, with clear per-metric explanations for buyers and suppliers.

- Foundry / LLM ranking is optional sugar; the **local composite scorer is the source of truth** and must work when agents are down.
- All required data is already in the schema. The job is wiring + weighting, not inventing new models.
- The `ScoreBreakdown` is the artifact that drives revenue on both sides:
  - **Buyers**: defensible, auditable RFQ decisions → enterprise SaaS willingness-to-pay.
  - **Suppliers**: a receipt for "here's why you lost" → Pro/Enterprise tier upgrades for analytics and verified-data improvements.

---

## What's already wired

| Component | File | Status |
|---|---|---|
| SWAP Engine entrypoint + DRAFT contract | `server/domain/swapEngine.ts` | Wired |
| Haversine + Azure Maps geocoding | `server/location-service.ts`, `server/azure-maps-service.ts` | Exists, not used by SWAP |
| Shipping class + service area gate | `server/lib/shipping-classes.ts` | Used (partially) |
| RFQ lat/lng columns | `drizzle/schema.ts` (rfqs) | Schema, not populated |
| Per-persona CCPS scores | `ccps_scores` + `decision_maker_personas` | Schema, not read |
| Supplier vetting metrics (OTIF, Z-score, lead time variance) | `suppliers.*` | Schema, not scored |
| Regional intelligence | `shipping_costs`, `climate_zone_adjustments`, `regional_swap_patterns`, `location_pricing_adjustments` | Schema, not read |
| Buyer-fit cache | `supplier_buyer_fit_inputs` | Schema, not read in SWAP |

## What's broken (the moat gaps)

From `server/domain/swapEngine.ts:192`:
```ts
isWithinServiceArea({
  distanceMiles: null,   // ← always null. Distance is never computed.
  ...
})
```

Current local scorer uses 5 signals: category match (40), cert overlap (30), EPD penalty (-10), sustainability score (30), state match (15). It ignores:

1. **Carbon**: `intent.maxGwp` is annotated but never compared to materials' `gwpValue` / `embodiedCarbonPer1000sf`.
2. **Real distance**: lat/lng selected but never converted to miles.
3. **Persona weights**: `decision_maker_personas` never loaded.
4. **CCPS per-persona scores**: cached in `ccps_scores` — never joined.
5. **Vetting**: `otifPercentage`, `supplierZScore`, `leadTimeVarianceDays`, `inventoryVisibility` — never scored.
6. **Financial**: `wlcPaybackYears`, `annualEnergySavingsPct`, `maintenanceCostPerSfPerYear` — never scored.
7. **Regional**: shipping cost, climate zone, location pricing, regional swap patterns — never applied.
8. **Buyer-fit cache**: `supplier_buyer_fit_inputs.buyerFitScore` — never read at match time.

---

## Data flow (target)

```
Architect submits raw RFQ text
        │
        ▼
document-intelligence.ts  ── parse intent ──▶ ParsedRfqTextFields
        │
        ▼
rfq.saveDraft (tRPC)
   1. geocodeProjectLocation()  ◀── NEW: ZIP/city → lat/lng + climate zone (Azure Maps)
   2. write rfqs row WITH lat/lng + projectClimateZone populated
   3. intentFromParsed() — pass coords through
        │
        ▼
swapEngine.runSwapEngine()
   1. fetchCandidates() — single denormalized query joining:
        suppliers · suppliers_location · supplier_buyer_fit_inputs
        · ccps_scores (persona-scoped) · material_credit_score_cache
   2. scoreCandidates() — composite weighted score (9 families, persona-weighted)
   3. rankSuppliersWithAgent() — Foundry tie-breaker / explanations
   4. Write rfq_match_runs row (append-only audit)
   5. Return SwapResult with scoreBreakdown[] per candidate
        │
        ▼
Architect reviews DRAFT, sees per-metric breakdown bars
        │
        ▼
rfq.approveDraft → creates rfq_requests rows
```

---

## Composite score — the 9 metric families

New file: `server/domain/scoring/composite-score.ts`

```ts
export interface ScoreBreakdown {
  carbon: number;         // 0-100 — gwpValue vs maxGwp, with climate zone adj
  compliance: number;     // 0-100 — compliance_rules state-match, Title24/IECC/CDPH
  certification: number;  // 0-100 — required certs overlap, EPD program verified
  cost: number;           // 0-100 — landed cost (price + shipping + location adj)
  supplyChain: number;    // 0-100 — distance, leadTime, OTIF, inventoryVisibility
  reliability: number;    // 0-100 — supplierZScore, leadTimeVariance, vetLastUpdatedAt
  financial: number;      // 0-100 — wlcPaybackYears, annualEnergySavingsPct
  regional: number;       // 0-100 — regionalSwapPattern approval rate for state
  buyerFit: number;       // 0-100 — cached supplier_buyer_fit_inputs.buyerFitScore
  composite: number;      // weighted total per persona
}

export function scoreCandidate(
  supplier: EnrichedCandidate,
  intent: ParsedRfqIntent,
  projectCoords: { lat: number; lng: number } | null,
  personaWeights: DecisionMakerPersona,
  context: { climateZone?: string; shippingCost?: ShippingCosts }
): ScoreBreakdown { ... }
```

**Persona weighting** is loaded from `decision_maker_personas`. v1 seed values:

| Persona | carbon | compliance | cert | cost | supplyChain | reliability | financial | regional | buyerFit |
|---|---|---|---|---|---|---|---|---|---|
| architect | 0.22 | 0.16 | 0.14 | 0.08 | 0.08 | 0.06 | 0.06 | 0.10 | 0.10 |
| gc_pm | 0.08 | 0.12 | 0.06 | 0.24 | 0.20 | 0.14 | 0.04 | 0.06 | 0.06 |
| owner_esg | 0.28 | 0.10 | 0.12 | 0.10 | 0.06 | 0.06 | 0.14 | 0.06 | 0.08 |
| procurement | 0.08 | 0.12 | 0.06 | 0.26 | 0.18 | 0.12 | 0.06 | 0.06 | 0.06 |

(Tunable from DB without redeploy.)

---

## Schema changes

**No new tables for v1 metrics.** All metric tables exist. Two adds:

```ts
// drizzle/schema.ts — rfqs (3 nullable cols, safe add)
geocodedAt: timestamp("geocoded_at"),
geocodeSource: varchar("geocode_source", { length: 32 }),   // "azure_maps" | "manual" | "fallback"
projectClimateZone: varchar("project_climate_zone", { length: 10 }),  // ASHRAE zone

// drizzle/schema.ts — NEW table (append-only audit)
export const rfqMatchRuns = pgTable("rfq_match_runs", {
  id: serial("id").primaryKey(),
  rfqId: integer("rfq_id").notNull(),
  draftId: integer("draft_id"),
  personaKey: varchar("persona_key", { length: 50 }).notNull(),
  candidatePoolSize: integer("candidate_pool_size").notNull(),
  scoreBreakdowns: json("score_breakdowns").notNull(),  // ScoreBreakdown[] frozen
  agentReasoning: text("agent_reasoning"),
  agentAvailable: boolean("agent_available").notNull(),
  runAt: timestamp("run_at").defaultNow().notNull(),
}, (t) => ({ rfqIdx: index("idx_rfq_match_runs_rfq").on(t.rfqId) }));
```

Why a separate `rfq_match_runs`: matching re-runs when the architect edits a draft. You need the diff of "what changed and why ranking moved." Cheap append-only log.

---

## Auth / multi-tenancy

- `swapEngine` already accepts `RequesterContext`. Every read in `fetchCandidates` stays scoped by user/role.
- `rfq_match_runs.rfqId` joins back through `rfqs.userId` — same `ctx.user.id` gate.

## Failure modes

| Failure | Behavior | User-visible |
|---|---|---|
| Azure Maps down | State-only matching, `geocodeSource = "fallback"` | "Distance estimates unavailable" |
| `decision_maker_personas` row missing | Use `default` persona (seeded) | Silent fallback |
| Foundry agent down | Local composite score IS the ranking | "AI ranking unavailable — score-based only" (existing) |
| `ccps_scores` cache miss | Compute inline + write cache | None — slower first hit |
| Supplier has no lat/lng | distance=null; `shipsNationwide=true` still passes | Lower on supplyChain unless nationwide |

## Rollback

- All new logic gated behind `FEATURE_COMPOSITE_SCORING` (default off in prod, on in dev).
- `rfq_match_runs` append-only; nothing to roll back.
- The three new `rfqs` columns are nullable.
- If broken: flip env var off → scorer reverts to current 5-signal logic.

---

## Trade-offs

| Decision | Alternative | Why |
|---|---|---|
| One denormalized query per match | N per-signal queries | p95 budget; joins cheap, round-trips aren't |
| Persona weights from DB | Hard-coded TS | Tune without redeploy |
| Append-only `rfq_match_runs` | Embed last result on draft | Lets you diff runs as draft is edited |
| Composite in TS, not SQL | Pure Postgres | Easier to test/extend; not a hot path yet |
| Read existing `supplier_buyer_fit_inputs` | Fresh cache | Already wired to RFQ events; just read it |
| Geocode at draft save | Geocode lazily at match | Saves repeat Azure Maps calls |

---

## Execution sprint (Day 1–7)

### Day 1 — Geocode wiring (RFQ save path)
- `geocodeProjectLocation()` in `rfq.saveDraft` (ZIP/city → lat/lng + climate zone via Azure Maps).
- Populate `rfqs.lat`, `rfqs.lng`, new `geocodedAt`, `geocodeSource`, `projectClimateZone`.
- Unit + integration test with mocked Azure Maps.
- **Outcome**: SWAP Engine stops guessing and uses real distances.

### Day 2 — Composite scoring module
- Create `server/domain/scoring/composite-score.ts` with `ScoreBreakdown` + `scoreCandidate()`.
- v1 rules per family (predictable, no ML):
  - **Carbon**: bonus when `gwpValue < intent.maxGwp`, climate-zone-adjusted.
  - **Compliance**: state-code match + required-rule coverage from `compliance_rules`.
  - **Certification**: cert overlap + EPD program verification.
  - **Cost**: normalized landed cost (price + shipping + location adj).
  - **SupplyChain**: distance, base lead time, OTIF, inventory visibility.
  - **Reliability**: Z-score, lead-time variance, vetting recency.
  - **Financial**: payback, energy savings, maintenance cost.
  - **Regional**: `regional_swap_patterns` approval rate for state.
  - **BuyerFit**: cached `buyerFitScore`.
- Persona weights from `decision_maker_personas`; defaults baked in if rows missing.
- Tests: 4 fictional personas × handful of candidates; assert ranking changes with weights.

### Day 3 — Denormalized candidate fetch
- Replace `swapEngine.fetchCandidates` with single Drizzle query joining:
  `suppliers · suppliers_location · supplier_buyer_fit_inputs · ccps_scores · material_credit_score_cache` + vetting + regional tables.
- Compute `distanceMiles` in TS via Haversine when both coords known; null otherwise.
- Scope by `RequesterContext`.
- Call `scoreCandidate()` per candidate and attach `ScoreBreakdown`.

### Day 4 — `rfq_match_runs` audit table
- Add the migration.
- Every SWAP run inserts: `rfqId`, `draftId`, `personaKey`, `candidatePoolSize`, full `scoreBreakdowns`, agent availability + reasoning.
- Behind feature flag from day one.

### Day 5 — UI: per-metric breakdown
- Architect RFQ review screen, per candidate:
  - Composite score.
  - Stacked bars or radar for the 9 families.
  - Text "higher because X, lower because Y" from `ScoreBreakdown`.
- "Compare top 3" view with numeric values per family.

### Days 6–7 — Persona seed + flagged rollout
- Seed `decision_maker_personas`: architect, gc_pm, owner_esg, procurement (weights above).
- `FEATURE_COMPOSITE_SCORING` env flag wraps everything.
- Pilot on internal RFQs + one friendly architect.

---

## Money-lane checks

- **Suppliers**: lose-reason breakdowns → upgrade pressure for analytics + verified-data improvements.
- **Buyers**: `rfq_match_runs` evidence + breakdowns → defensible, auditable decisions → enterprise SaaS justification.

If a feature doesn't extend the breakdown or the audit trail, it's not in v1.

---

## Hard "do not do" list

- Do **not** add new metric families before v1 ships.
- Do **not** create new tables when an existing one covers the data.
- Do **not** make Foundry/LLM agents required — local scorer is the source of truth.
- Do **not** geocode at match time when you can do it once at draft save.
- Do **not** ship without `rfq_match_runs` — the audit trail IS the product.
