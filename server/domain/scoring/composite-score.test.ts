import { describe, it, expect } from "vitest";
import {
  scoreCandidate,
  getPersonaWeights,
  type EnrichedCandidate,
  type ScoringIntent,
} from "./composite-score";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BASE: EnrichedCandidate = {
  id: 0,
  companyName: "Test Supplier",
  city: null,
  state: null,
  materialCategories: ["concrete"],
  certifications: [],
  sustainabilityScore: null,
  isLocalSupplier: false,
  matchScore: 50,
  gwpValue: null,
  hasEpd: false,
  otifPercentage: null,
  avgLeadTimeDays: null,
  leadTimeVarianceDays: null,
  supplierZScore: null,
  inventoryVisibility: false,
  vetLastUpdatedAt: null,
  buyerFitScore: null,
  avgRfqResponseHours: null,
  priceIndexVsMedian: null,
  completedRfqCount: 0,
  noShowCount: 0,
  leadTimeDays: null,
  distanceMiles: null,
};

/** EPD on file, low GWP, LEED cert, close to site, healthy Z-score */
const highSustainability: EnrichedCandidate = {
  ...BASE,
  id: 1,
  companyName: "GreenBuild Materials",
  state: "WA",
  certifications: ["LEED", "ISO 14001", "EPD"],
  hasEpd: true,
  gwpValue: 45,              // well below 80 limit
  otifPercentage: 96,
  avgLeadTimeDays: 14,
  leadTimeVarianceDays: 2,
  supplierZScore: 3.2,
  inventoryVisibility: true,
  vetLastUpdatedAt: new Date(Date.now() - 30 * 86_400_000), // 30 days ago
  distanceMiles: 80,
  isLocalSupplier: true,
  priceIndexVsMedian: 1.05, // 5% above median
  buyerFitScore: 72,
  avgRfqResponseHours: 8,
  completedRfqCount: 34,
  noShowCount: 0,
};

/** No EPD, very cheap, 20mi away, fast response, high OTIF */
const cheapFast: EnrichedCandidate = {
  ...BASE,
  id: 2,
  companyName: "QuikConcrete Supply",
  state: "WA",
  certifications: [],
  hasEpd: false,
  gwpValue: null,
  otifPercentage: 98,
  avgLeadTimeDays: 7,
  leadTimeVarianceDays: 1,
  supplierZScore: 2.6,
  inventoryVisibility: true,
  vetLastUpdatedAt: new Date(Date.now() - 60 * 86_400_000),
  distanceMiles: 20,
  isLocalSupplier: true,
  priceIndexVsMedian: 0.78, // 22% below median
  buyerFitScore: 68,
  avgRfqResponseHours: 2,
  completedRfqCount: 82,
  noShowCount: 0,
};

/** Many certs + EPD, but far from site and above-median price */
const certHeavy: EnrichedCandidate = {
  ...BASE,
  id: 3,
  companyName: "CertFirst Building",
  state: "NY",
  certifications: ["LEED", "ISO 14001", "EPD", "Cradle to Cradle"],
  hasEpd: true,
  gwpValue: 38,              // best carbon performance
  otifPercentage: 88,
  avgLeadTimeDays: 21,
  leadTimeVarianceDays: 6,
  supplierZScore: 2.1,
  inventoryVisibility: false,
  vetLastUpdatedAt: new Date(Date.now() - 200 * 86_400_000),
  distanceMiles: 2800,       // cross-country
  isLocalSupplier: false,
  priceIndexVsMedian: 1.18, // 18% above median
  buyerFitScore: 60,
  avgRfqResponseHours: 18,
  completedRfqCount: 21,
  noShowCount: 1,
};

/** Excellent reliability metrics, no EPD, moderate price */
const reliableNoEpd: EnrichedCandidate = {
  ...BASE,
  id: 4,
  companyName: "Reliable Ready-Mix",
  state: "OR",
  certifications: ["ISO 14001"],
  hasEpd: false,
  gwpValue: null,
  otifPercentage: 99,
  avgLeadTimeDays: 10,
  leadTimeVarianceDays: 1,
  supplierZScore: 3.5,
  inventoryVisibility: true,
  vetLastUpdatedAt: new Date(Date.now() - 45 * 86_400_000),
  distanceMiles: 160,
  isLocalSupplier: true,
  priceIndexVsMedian: 0.97,
  buyerFitScore: 80,
  avgRfqResponseHours: 6,
  completedRfqCount: 110,
  noShowCount: 0,
};

const INTENT_CONCRETE: ScoringIntent = {
  maxGwp: 80,
  epdRequired: true,
  certifications: ["LEED", "EPD"],
  projectState: "WA",
  category: "concrete",
};

// ── Helper ────────────────────────────────────────────────────────────────────

function rank(candidates: EnrichedCandidate[], intent: ScoringIntent, persona: Parameters<typeof getPersonaWeights>[0]) {
  const weights = getPersonaWeights(persona);
  return candidates
    .map((c) => scoreCandidate(c, intent, weights))
    .sort((a, b) => b.total - a.total)
    .map((s) => s.supplierId);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("scoreCandidate — carbon metric", () => {
  it("rewards EPD with GWP below limit", () => {
    const result = scoreCandidate(highSustainability, INTENT_CONCRETE, getPersonaWeights("architect"));
    expect(result.carbon.raw).toBeGreaterThan(60);
  });

  it("penalizes supplier that exceeds GWP limit", () => {
    const exceeds: EnrichedCandidate = { ...highSustainability, gwpValue: 120 };
    const result = scoreCandidate(exceeds, INTENT_CONCRETE, getPersonaWeights("architect"));
    expect(result.carbon.raw).toBeLessThan(40);
  });

  it("assigns low carbon score when no EPD present", () => {
    const result = scoreCandidate(cheapFast, INTENT_CONCRETE, getPersonaWeights("architect"));
    expect(result.carbon.raw).toBe(20);
    expect(result.carbon.reason).toMatch(/No EPD/);
  });

  it("scores best carbon for lowest GWP with headroom", () => {
    const optimal: EnrichedCandidate = { ...highSustainability, gwpValue: 8 };
    const result = scoreCandidate(optimal, INTENT_CONCRETE, getPersonaWeights("architect"));
    expect(result.carbon.raw).toBeGreaterThan(90);
  });
});

describe("scoreCandidate — certification metric", () => {
  it("gives full score when all required certs match and EPD present", () => {
    const result = scoreCandidate(highSustainability, INTENT_CONCRETE, getPersonaWeights("architect"));
    expect(result.certification.raw).toBeGreaterThan(60);
  });

  it("penalizes missing EPD when epdRequired", () => {
    const result = scoreCandidate(cheapFast, INTENT_CONCRETE, getPersonaWeights("architect"));
    expect(result.certification.raw).toBeLessThan(20);
    expect(result.certification.reason).toMatch(/EPD missing/);
  });

  it("gives neutral cert score when no certs required", () => {
    const openIntent: ScoringIntent = { projectState: "WA" };
    const result = scoreCandidate(BASE, openIntent, getPersonaWeights("default"));
    expect(result.certification.raw).toBe(50); // 50 + 0 certs * 10
  });
});

describe("scoreCandidate — reliability metric", () => {
  it("rewards high OTIF + low variance + healthy Z-score", () => {
    const result = scoreCandidate(reliableNoEpd, INTENT_CONCRETE, getPersonaWeights("gc_pm"));
    expect(result.reliability.raw).toBeGreaterThan(70);
  });

  it("penalizes missing vetting data with a mild penalty", () => {
    const result = scoreCandidate(BASE, INTENT_CONCRETE, getPersonaWeights("default"));
    // Neutral OTIF(25) + neutral variance(12) + neutral Z(12) - no-vetting penalty(5) = 44
    expect(result.reliability.raw).toBeCloseTo(44, 0);
  });
});

describe("scoreCandidate — supply chain metric", () => {
  it("strongly rewards very close supplier", () => {
    const result = scoreCandidate(cheapFast, INTENT_CONCRETE, getPersonaWeights("gc_pm"));
    expect(result.supplyChain.raw).toBeGreaterThan(70);
    expect(result.supplyChain.reason).toMatch(/20mi/);
  });

  it("penalizes cross-country distance", () => {
    const result = scoreCandidate(certHeavy, INTENT_CONCRETE, getPersonaWeights("gc_pm"));
    expect(result.supplyChain.raw).toBeLessThan(50);
  });
});

describe("scoreCandidate — cost metric", () => {
  it("rewards below-median price", () => {
    const result = scoreCandidate(cheapFast, INTENT_CONCRETE, getPersonaWeights("procurement"));
    expect(result.cost.raw).toBeGreaterThan(60);
    expect(result.cost.reason).toMatch(/below market median/);
  });

  it("returns neutral when price data unavailable", () => {
    const result = scoreCandidate(BASE, INTENT_CONCRETE, getPersonaWeights("default"));
    expect(result.cost.raw).toBe(50);
  });
});

describe("persona weighting changes ranking", () => {
  const candidates = [highSustainability, cheapFast, certHeavy, reliableNoEpd];

  it("architect persona ranks the high-sustainability supplier first", () => {
    const ranked = rank(candidates, INTENT_CONCRETE, "architect");
    // highSustainability wins on carbon + certification
    expect(ranked[0]).toBe(highSustainability.id);
  });

  it("gc_pm persona ranks cheap+fast supplier above the cross-country cert-heavy one", () => {
    const weights = getPersonaWeights("gc_pm");
    const scores = candidates.map((c) => scoreCandidate(c, INTENT_CONCRETE, weights));
    const cheapScore = scores.find((s) => s.supplierId === cheapFast.id)!;
    const certScore  = scores.find((s) => s.supplierId === certHeavy.id)!;
    expect(cheapScore.total).toBeGreaterThan(certScore.total);
  });

  it("owner_esg persona gives heaviest carbon weight and certHeavy scores top carbon", () => {
    const weights = getPersonaWeights("owner_esg");
    const scores = candidates.map((c) => scoreCandidate(c, INTENT_CONCRETE, weights));
    // certHeavy has the lowest GWP (38) — owner_esg cares most about carbon
    const certScore   = scores.find((s) => s.supplierId === certHeavy.id)!;
    const cheapScore  = scores.find((s) => s.supplierId === cheapFast.id)!;
    expect(certScore.carbon.raw).toBeGreaterThan(cheapScore.carbon.raw);
    expect(weights.carbon).toBeGreaterThanOrEqual(0.25);
  });

  it("procurement persona gives cheapFast a higher cost score than highSustainability", () => {
    const weights = getPersonaWeights("procurement");
    const scores = candidates.map((c) => scoreCandidate(c, INTENT_CONCRETE, weights));
    const cheapScore = scores.find((s) => s.supplierId === cheapFast.id)!;
    const highScore  = scores.find((s) => s.supplierId === highSustainability.id)!;
    expect(cheapScore.cost.raw).toBeGreaterThan(highScore.cost.raw);
    expect(weights.cost).toBeGreaterThanOrEqual(0.22);
  });

  it("changing weights from architect to procurement actually changes the ranking", () => {
    const archRank = rank(candidates, INTENT_CONCRETE, "architect");
    const procRank = rank(candidates, INTENT_CONCRETE, "procurement");
    // The orderings should differ — procurement prioritises cost+supplyChain
    expect(archRank).not.toEqual(procRank);
  });
});

describe("scoreCandidate — composites and invariants", () => {
  it("total is always 0–100", () => {
    const allCandidates = [highSustainability, cheapFast, certHeavy, reliableNoEpd, BASE];
    const personas = ["architect", "gc_pm", "owner_esg", "procurement", "default"] as const;
    for (const c of allCandidates) {
      for (const p of personas) {
        const result = scoreCandidate(c, INTENT_CONCRETE, getPersonaWeights(p));
        expect(result.total).toBeGreaterThanOrEqual(0);
        expect(result.total).toBeLessThanOrEqual(100);
      }
    }
  });

  it("metric weights are normalised and sum to ~1", () => {
    const personas = ["architect", "gc_pm", "owner_esg", "procurement", "default"] as const;
    for (const p of personas) {
      const result = scoreCandidate(BASE, INTENT_CONCRETE, getPersonaWeights(p));
      const weightSum =
        result.carbon.weight + result.compliance.weight + result.certification.weight +
        result.cost.weight   + result.supplyChain.weight + result.reliability.weight  +
        result.financial.weight + result.regional.weight + result.buyerFit.weight;
      expect(weightSum).toBeCloseTo(1.0, 2);
    }
  });

  it("scoreCandidate carries through the supplierId", () => {
    const result = scoreCandidate(certHeavy, INTENT_CONCRETE, getPersonaWeights("default"));
    expect(result.supplierId).toBe(certHeavy.id);
  });

  it("each MetricScore includes a non-empty reason string", () => {
    const result = scoreCandidate(highSustainability, INTENT_CONCRETE, getPersonaWeights("architect"));
    const metrics = [
      result.carbon, result.compliance, result.certification, result.cost,
      result.supplyChain, result.reliability, result.financial, result.regional, result.buyerFit,
    ];
    for (const m of metrics) {
      expect(m.reason.length).toBeGreaterThan(0);
    }
  });
});
