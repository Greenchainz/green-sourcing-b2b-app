/**
 * Composite Carbon Procurement Score (CCPS) — per-candidate scoring module
 * ──────────────────────────────────────────────────────────────────────────
 * Pure functions only — no DB calls, no side effects.
 * All data needed for scoring must be pre-loaded into EnrichedCandidate.
 *
 * 9 metric families:
 *   carbon | compliance | certification | cost | supplyChain
 *   reliability | financial | regional | buyerFit
 *
 * Each family produces a MetricScore (raw 0-100, weighted, reason string).
 * Persona weights determine the final composite total.
 *
 * DB loading: loadPersonaWeights() reads decision_maker_personas and merges
 * with hardcoded defaults for the 3 families not yet in the schema
 * (financial, regional, buyerFit). Falls back gracefully if DB is unavailable.
 */

import { getDb } from "../../db";
import { decisionMakerPersonas } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";

// ── Persona types ─────────────────────────────────────────────────────────────

export type PersonaKey = "architect" | "gc_pm" | "owner_esg" | "procurement" | "default";

export interface PersonaWeights {
  carbon: number;
  compliance: number;
  certification: number;
  cost: number;
  supplyChain: number;
  reliability: number;
  financial: number;
  regional: number;
  buyerFit: number;
}

// ── Scoring types ─────────────────────────────────────────────────────────────

export interface MetricScore {
  /** Raw score 0–100 before weighting */
  raw: number;
  /** raw × normalized weight */
  weighted: number;
  /** Normalized weight (0–1) applied */
  weight: number;
  /** Human-readable explanation for UI display */
  reason: string;
}

export interface ScoreBreakdown {
  supplierId: number;
  /** Composite 0–100 total */
  total: number;
  carbon: MetricScore;
  compliance: MetricScore;
  certification: MetricScore;
  cost: MetricScore;
  supplyChain: MetricScore;
  reliability: MetricScore;
  financial: MetricScore;
  regional: MetricScore;
  buyerFit: MetricScore;
}

// ── Enriched candidate ────────────────────────────────────────────────────────

/**
 * Extends SupplierCandidate with all fields needed for multi-metric scoring.
 * Pre-populated by the denormalized fetchCandidates query in swapEngine.
 */
export interface EnrichedCandidate {
  // Core identity (from SupplierCandidate)
  id: number;
  companyName: string;
  city: string | null;
  state: string | null;
  materialCategories: string[] | null;
  certifications: string[] | null;
  sustainabilityScore: number | null;
  isLocalSupplier: boolean;
  matchScore: number;

  // Carbon / EPD (from supplier_material_epds — best active EPD for this supplier)
  gwpValue: number | null;        // kgCO2e per declared unit
  hasEpd: boolean;

  // Reliability vetting (from suppliers table)
  otifPercentage: number | null;         // On-Time In-Full rate (0–100)
  avgLeadTimeDays: number | null;        // Average PO→delivery
  leadTimeVarianceDays: number | null;   // ±days variance (lower = reliable)
  supplierZScore: number | null;         // Altman Z-score proxy
  inventoryVisibility: boolean;          // Real-time stock feed available
  vetLastUpdatedAt: Date | null;         // When vetting data was last refreshed

  // Buyer-fit signals (from supplier_buyer_fit_inputs, matched by project ZIP)
  buyerFitScore: number | null;          // Cached composite 0–100
  avgRfqResponseHours: number | null;    // Average response time to RFQ invitations
  priceIndexVsMedian: number | null;     // 1.0 = median, <1 = cheaper, >1 = more expensive
  completedRfqCount: number;             // Completed RFQs via platform
  noShowCount: number;                   // RFQ invitations ignored
  leadTimeDays: number | null;           // Route-specific lead time (may differ from avg)

  // Pre-computed by swapEngine after geocoding
  distanceMiles: number | null;
}

// ── Intent context for scoring ────────────────────────────────────────────────

export interface ScoringIntent {
  maxGwp?: number;
  epdRequired?: boolean;
  certifications?: string[];
  projectState?: string;
  projectClimateZone?: string;
  category?: string;
}

// ── Hardcoded persona weight defaults ────────────────────────────────────────
// Used when DB has no row for this persona, and for financial/regional/buyerFit
// which don't yet have DB columns. Each row must sum to 1.0.

const PERSONA_DEFAULTS: Record<PersonaKey, PersonaWeights> = {
  architect: {
    carbon: 0.22, compliance: 0.16, certification: 0.14,
    cost: 0.08,   supplyChain: 0.08, reliability: 0.06,
    financial: 0.06, regional: 0.10, buyerFit: 0.10,
  },
  gc_pm: {
    carbon: 0.10, compliance: 0.12, certification: 0.08,
    cost: 0.22,   supplyChain: 0.18, reliability: 0.14,
    financial: 0.06, regional: 0.06, buyerFit: 0.04,
  },
  owner_esg: {
    carbon: 0.28, compliance: 0.20, certification: 0.16,
    cost: 0.08,   supplyChain: 0.06, reliability: 0.06,
    financial: 0.08, regional: 0.04, buyerFit: 0.04,
  },
  procurement: {
    carbon: 0.08, compliance: 0.14, certification: 0.08,
    cost: 0.26,   supplyChain: 0.18, reliability: 0.14,
    financial: 0.06, regional: 0.04, buyerFit: 0.02,
  },
  default: {
    carbon: 0.15, compliance: 0.14, certification: 0.12,
    cost: 0.14,   supplyChain: 0.13, reliability: 0.12,
    financial: 0.08, regional: 0.08, buyerFit: 0.04,
  },
};

// ── Sync weight lookup ────────────────────────────────────────────────────────

/** Returns hardcoded defaults — use loadPersonaWeights() to prefer DB values. */
export function getPersonaWeights(key: PersonaKey): PersonaWeights {
  return PERSONA_DEFAULTS[key] ?? PERSONA_DEFAULTS.default;
}

// ── DB-backed weight loader ───────────────────────────────────────────────────

/**
 * Loads persona weights from decision_maker_personas, merging with code defaults
 * for the 3 families (financial/regional/buyerFit) not yet in the DB schema.
 * Falls back gracefully on DB miss or error.
 */
export async function loadPersonaWeights(personaKey: PersonaKey): Promise<PersonaWeights> {
  try {
    const db = await getDb();
    if (!db) return PERSONA_DEFAULTS[personaKey] ?? PERSONA_DEFAULTS.default;

    const [row] = await db
      .select()
      .from(decisionMakerPersonas)
      .where(eq(decisionMakerPersonas.personaKey, personaKey))
      .limit(1);

    if (!row) return PERSONA_DEFAULTS[personaKey] ?? PERSONA_DEFAULTS.default;

    const defaults = PERSONA_DEFAULTS[personaKey] ?? PERSONA_DEFAULTS.default;

    // DB covers 6 of 9 families. healthWeight ≈ reliability.
    // financial/regional/buyerFit use code defaults until schema adds those columns.
    const merged: PersonaWeights = {
      carbon:        row.carbonWeight        != null ? parseFloat(row.carbonWeight)        : defaults.carbon,
      compliance:    row.complianceWeight    != null ? parseFloat(row.complianceWeight)    : defaults.compliance,
      certification: row.certificationWeight != null ? parseFloat(row.certificationWeight) : defaults.certification,
      cost:          row.costWeight          != null ? parseFloat(row.costWeight)          : defaults.cost,
      supplyChain:   row.supplyChainWeight   != null ? parseFloat(row.supplyChainWeight)   : defaults.supplyChain,
      reliability:   row.healthWeight        != null ? parseFloat(row.healthWeight)        : defaults.reliability,
      financial: defaults.financial,
      regional:  defaults.regional,
      buyerFit:  defaults.buyerFit,
    };

    // Renormalize so weights always sum to 1.0
    const sum = Object.values(merged).reduce((a, b) => a + b, 0);
    if (sum > 0 && Math.abs(sum - 1.0) > 0.005) {
      (Object.keys(merged) as (keyof PersonaWeights)[]).forEach((k) => {
        merged[k] /= sum;
      });
    }

    return merged;
  } catch (err) {
    console.error("[composite-score] Failed to load persona weights:", err);
    return PERSONA_DEFAULTS[personaKey] ?? PERSONA_DEFAULTS.default;
  }
}

// ── Per-family scoring functions (all pure) ───────────────────────────────────

function scoreCarbon(
  candidate: EnrichedCandidate,
  intent: ScoringIntent,
): { raw: number; reason: string } {
  if (!candidate.hasEpd || candidate.gwpValue == null) {
    return { raw: 20, reason: "No EPD on file — carbon impact unverified" };
  }

  const gwp = candidate.gwpValue;

  if (intent.maxGwp == null) {
    // No limit — reward transparency + low absolute GWP (100 kgCO2e as reference ceiling)
    const raw = Math.max(30, Math.min(100, Math.round(100 - (gwp / 100) * 40)));
    return { raw, reason: `GWP ${gwp} kgCO₂e (no project limit set)` };
  }

  if (gwp <= intent.maxGwp) {
    const headroomPct = (intent.maxGwp - gwp) / intent.maxGwp;
    const raw = Math.round(60 + headroomPct * 40); // 60–100
    return {
      raw: Math.min(100, raw),
      reason: `GWP ${gwp} kgCO₂e — ${Math.round(headroomPct * 100)}% below limit of ${intent.maxGwp}`,
    };
  }

  // Exceeds limit
  const exceedPct = (gwp - intent.maxGwp) / intent.maxGwp;
  const raw = Math.max(0, Math.round(40 - exceedPct * 40));
  return { raw, reason: `GWP ${gwp} kgCO₂e — exceeds project limit of ${intent.maxGwp}` };
}

function scoreCompliance(
  candidate: EnrichedCandidate,
  intent: ScoringIntent,
): { raw: number; reason: string } {
  const certs = (candidate.certifications ?? []).map((c) => c.toLowerCase());
  let score = 40;
  const hits: string[] = [];

  if (certs.some((c) => c.includes("iso 14001"))) {
    score += 20;
    hits.push("ISO 14001");
  }
  if (certs.some((c) => c.includes("leed"))) {
    score += 15;
    hits.push("LEED-aligned");
  }
  if (candidate.hasEpd) {
    score += 15;
    hits.push("EPD documented");
  }
  // Same-state suppliers are more likely to know local code requirements
  if (intent.projectState && candidate.state === intent.projectState) {
    score += 10;
    hits.push("in-state supplier");
  }

  return {
    raw: Math.min(100, score),
    reason: hits.length > 0 ? `Compliance signals: ${hits.join(", ")}` : "No compliance certifications on file",
  };
}

function scoreCertification(
  candidate: EnrichedCandidate,
  intent: ScoringIntent,
): { raw: number; reason: string } {
  const supplierCerts = (candidate.certifications ?? []).map((c) => c.toLowerCase());
  const requiredCerts = (intent.certifications ?? []).map((c) => c.toLowerCase());

  if (requiredCerts.length === 0) {
    const raw = Math.min(100, 50 + supplierCerts.length * 10);
    return { raw, reason: `${supplierCerts.length} certification(s) on file` };
  }

  const matched = requiredCerts.filter((rc) =>
    supplierCerts.some((sc) => sc.includes(rc) || rc.includes(sc))
  );

  let raw = Math.round((matched.length / requiredCerts.length) * 80);

  if (intent.epdRequired) {
    if (candidate.hasEpd) raw += 20;
    else raw = Math.max(0, raw - 10);
  }

  raw = Math.max(0, Math.min(100, raw));

  const epd = intent.epdRequired
    ? candidate.hasEpd ? " + EPD verified" : " — EPD missing"
    : "";

  return {
    raw,
    reason: `${matched.length}/${requiredCerts.length} required certs matched${epd}`,
  };
}

function scoreCost(
  candidate: EnrichedCandidate,
): { raw: number; reason: string } {
  if (candidate.priceIndexVsMedian == null) {
    return { raw: 50, reason: "Price data not yet available" };
  }

  // 1.0 = at median → 60; 0.8 (cheaper) → 70; 1.2 (pricier) → 50
  const raw = Math.max(0, Math.min(100, Math.round(60 + (1 - candidate.priceIndexVsMedian) * 50)));
  const delta = Math.round((1 - candidate.priceIndexVsMedian) * 100);
  const reason =
    delta >= 0
      ? `Price ${delta}% below market median`
      : `Price ${Math.abs(delta)}% above market median`;

  return { raw, reason };
}

function scoreSupplyChain(
  candidate: EnrichedCandidate,
): { raw: number; reason: string } {
  const reasons: string[] = [];

  // Distance component (0–40)
  let distanceScore = 20; // neutral when unknown
  if (candidate.distanceMiles != null) {
    const d = candidate.distanceMiles;
    if (d <= 50)       distanceScore = 40;
    else if (d <= 150) distanceScore = 30;
    else if (d <= 300) distanceScore = 20;
    else if (d <= 500) distanceScore = 10;
    else               distanceScore = 0;
    reasons.push(`${Math.round(d)}mi from site`);
  } else if (candidate.isLocalSupplier) {
    distanceScore = 25;
    reasons.push("in-region supplier");
  }

  // Lead time component (0–30; industry avg ~21d)
  let leadTimeScore = 15; // neutral when unknown
  const lt = candidate.leadTimeDays ?? candidate.avgLeadTimeDays;
  if (lt != null) {
    if (lt <= 7)       leadTimeScore = 30;
    else if (lt <= 14) leadTimeScore = 25;
    else if (lt <= 21) leadTimeScore = 18;
    else if (lt <= 30) leadTimeScore = 12;
    else if (lt <= 45) leadTimeScore = 6;
    else               leadTimeScore = 0;
    reasons.push(`${lt}d lead time`);
  }

  // Inventory visibility (0–10)
  const inventoryScore = candidate.inventoryVisibility ? 10 : 0;
  if (candidate.inventoryVisibility) reasons.push("real-time inventory");

  // OTIF bonus layered in (0–10)
  let otifBonus = 0;
  if (candidate.otifPercentage != null) {
    if (candidate.otifPercentage >= 97)      otifBonus = 10;
    else if (candidate.otifPercentage >= 90) otifBonus = 6;
    else if (candidate.otifPercentage >= 80) otifBonus = 2;
  }

  const raw = Math.min(100, distanceScore + leadTimeScore + inventoryScore + otifBonus);
  return {
    raw,
    reason: reasons.length > 0 ? reasons.join(", ") : "Supply chain data not available",
  };
}

function scoreReliability(
  candidate: EnrichedCandidate,
): { raw: number; reason: string } {
  const reasons: string[] = [];

  // OTIF (0–50)
  let otifScore = 25; // neutral when unknown
  if (candidate.otifPercentage != null) {
    otifScore = Math.round(candidate.otifPercentage / 2);
    reasons.push(`${candidate.otifPercentage}% OTIF`);
  }

  // Lead time variance (0–25; lower = more reliable)
  let varianceScore = 12; // neutral when unknown
  if (candidate.leadTimeVarianceDays != null) {
    const v = candidate.leadTimeVarianceDays;
    if (v <= 1)       varianceScore = 25;
    else if (v <= 3)  varianceScore = 20;
    else if (v <= 7)  varianceScore = 15;
    else if (v <= 14) varianceScore = 8;
    else              varianceScore = 2;
    reasons.push(`±${v}d variance`);
  }

  // Altman Z-score (0–25)
  let zScore = 12; // neutral when unknown
  if (candidate.supplierZScore != null) {
    const z = candidate.supplierZScore;
    if (z >= 3.0)       { zScore = 25; reasons.push(`Z-score safe (${z.toFixed(1)})`); }
    else if (z >= 2.0)  { zScore = 18; reasons.push(`Z-score ${z.toFixed(1)}`); }
    else if (z >= 1.81) { zScore = 12; reasons.push("Z-score grey zone"); }
    else                { zScore = 4;  reasons.push("Z-score distress"); }
  }

  // Vetting freshness penalty (0 to −10)
  let freshnessPenalty = 5; // mild penalty when never vetted
  if (candidate.vetLastUpdatedAt) {
    const daysSince = (Date.now() - candidate.vetLastUpdatedAt.getTime()) / 86_400_000;
    if (daysSince <= 90)      freshnessPenalty = 0;
    else if (daysSince <= 365) freshnessPenalty = 3;
    else if (daysSince <= 730) freshnessPenalty = 6;
    else                       freshnessPenalty = 10;
  }

  const raw = Math.max(0, Math.min(100, otifScore + varianceScore + zScore - freshnessPenalty));
  return {
    raw,
    reason: reasons.length > 0 ? reasons.join(", ") : "No reliability vetting data on file",
  };
}

function scoreFinancial(
  candidate: EnrichedCandidate,
): { raw: number; reason: string } {
  // V1: Altman Z-score proxy as financial health signal.
  // Future: incorporate per-material payback period + lifecycle cost estimates.
  if (candidate.supplierZScore == null) {
    return { raw: 50, reason: "Financial health data not yet available" };
  }

  const z = candidate.supplierZScore;

  if (z >= 3.0)       return { raw: 90, reason: `Z-score ${z.toFixed(1)} — financially healthy` };
  if (z >= 2.5)       return { raw: 72, reason: `Z-score ${z.toFixed(1)} — stable` };
  if (z >= 1.81)      return { raw: 52, reason: `Z-score ${z.toFixed(1)} — grey zone` };
  if (z >= 1.0)       return { raw: 30, reason: `Z-score ${z.toFixed(1)} — financial stress` };
  return               { raw: 12, reason: `Z-score ${z.toFixed(1)} — high financial risk` };
}

function scoreRegional(
  candidate: EnrichedCandidate,
  intent: ScoringIntent,
): { raw: number; reason: string } {
  // V1: geographic proximity as regional fit proxy.
  // Future: join regional_swap_patterns for empirical approvalRate by state+category.
  if (candidate.distanceMiles != null) {
    const d = candidate.distanceMiles;
    let raw: number;
    if (d <= 50)       raw = 95;
    else if (d <= 100) raw = 85;
    else if (d <= 250) raw = 70;
    else if (d <= 500) raw = 55;
    else               raw = 35;
    return { raw, reason: `${Math.round(d)}mi from project site` };
  }

  if (intent.projectState && candidate.state === intent.projectState) {
    return { raw: 75, reason: `Same-state supplier (${candidate.state})` };
  }
  if (candidate.isLocalSupplier) {
    return { raw: 60, reason: "Ships to project region" };
  }
  return { raw: 40, reason: "No regional proximity data" };
}

function scoreBuyerFit(
  candidate: EnrichedCandidate,
): { raw: number; reason: string } {
  let base = candidate.buyerFitScore ?? 55; // neutral when no cache
  base = Math.max(0, Math.min(100, base));

  let adjustment = 0;
  const reasons: string[] = [];

  if (candidate.avgRfqResponseHours != null) {
    if (candidate.avgRfqResponseHours < 4)        { adjustment += 10; reasons.push("fast responder"); }
    else if (candidate.avgRfqResponseHours < 24)  { adjustment += 5;  reasons.push("same-day response"); }
    else if (candidate.avgRfqResponseHours > 72)  { adjustment -= 10; reasons.push("slow response history"); }
  }

  if (candidate.completedRfqCount > 50)      { adjustment += 5;  reasons.push(`${candidate.completedRfqCount} RFQs completed`); }
  else if (candidate.completedRfqCount < 5)  { adjustment -= 5;  reasons.push("limited RFQ history"); }

  if (candidate.noShowCount > 3)        { adjustment -= 15; reasons.push(`${candidate.noShowCount} no-shows`); }
  else if (candidate.noShowCount > 0)   { adjustment -= 5; }

  const raw = Math.max(0, Math.min(100, Math.round(base + adjustment)));
  return {
    raw,
    reason: reasons.length > 0 ? reasons.join(", ") : "Buyer-fit score from platform history",
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Scores a single candidate against the RFQ intent using the provided persona weights.
 * Pure function — deterministic, no I/O.
 */
export function scoreCandidate(
  candidate: EnrichedCandidate,
  intent: ScoringIntent,
  weights: PersonaWeights,
): ScoreBreakdown {
  const raw = {
    carbon:        scoreCarbon(candidate, intent),
    compliance:    scoreCompliance(candidate, intent),
    certification: scoreCertification(candidate, intent),
    cost:          scoreCost(candidate),
    supplyChain:   scoreSupplyChain(candidate),
    reliability:   scoreReliability(candidate),
    financial:     scoreFinancial(candidate),
    regional:      scoreRegional(candidate, intent),
    buyerFit:      scoreBuyerFit(candidate),
  };

  // Normalize weights so floating-point drift doesn't skew totals
  const wSum = (Object.values(weights) as number[]).reduce((a, b) => a + b, 0);
  const factor = wSum > 0.001 ? 1 / wSum : 1;

  function metric(family: keyof typeof raw, weight: number): MetricScore {
    const nw = weight * factor;
    return {
      raw:      raw[family].raw,
      weighted: Math.round(raw[family].raw * nw * 10) / 10,
      weight:   Math.round(nw * 1000) / 1000,
      reason:   raw[family].reason,
    };
  }

  const scores: Omit<ScoreBreakdown, "supplierId" | "total"> = {
    carbon:        metric("carbon",        weights.carbon),
    compliance:    metric("compliance",    weights.compliance),
    certification: metric("certification", weights.certification),
    cost:          metric("cost",          weights.cost),
    supplyChain:   metric("supplyChain",   weights.supplyChain),
    reliability:   metric("reliability",   weights.reliability),
    financial:     metric("financial",     weights.financial),
    regional:      metric("regional",      weights.regional),
    buyerFit:      metric("buyerFit",      weights.buyerFit),
  };

  const total = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        scores.carbon.weighted        +
        scores.compliance.weighted    +
        scores.certification.weighted +
        scores.cost.weighted          +
        scores.supplyChain.weighted   +
        scores.reliability.weighted   +
        scores.financial.weighted     +
        scores.regional.weighted      +
        scores.buyerFit.weighted,
      ),
    ),
  );

  return { supplierId: candidate.id, total, ...scores };
}
