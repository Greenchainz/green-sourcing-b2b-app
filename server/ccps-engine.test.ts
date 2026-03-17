import { describe, it, expect } from "vitest";
import {
  calcCarbonScore,
  calcComplianceScore,
  calcCertificationScore,
  calcCostScore,
  calcSupplyChainScore,
  calcHealthScore,
  calcSourcingDifficulty,
  calculateCcps,
  personaToWeights,
  calcCarbonDelta,
  calculateAssemblyLevelImpact,
} from "./ccps-engine";

describe("calcCarbonScore", () => {
  it("returns 100 for zero GWP", () => {
    expect(calcCarbonScore({ gwpValue: "0" }, { baselineGwpPerUnit: "10" })).toBe(100);
  });
  it("returns 100 for material at baseline GWP (ratio=1)", () => {
    expect(calcCarbonScore({ gwpValue: "10" }, { baselineGwpPerUnit: "10" })).toBe(100);
  });
  it("returns lower score for material above baseline", () => {
    expect(calcCarbonScore({ gwpValue: "20" }, { baselineGwpPerUnit: "10" })).toBeLessThan(100);
  });
  it("handles zero baseline (0 becomes 1 via fallback)", () => {
    // Number("0") || 1 = 1, so baseGwp=1, ratio=5, score=max(0,100*(1-(5-1)*0.5))=max(0,-100)=0
    expect(calcCarbonScore({ gwpValue: "5" }, { baselineGwpPerUnit: "0" })).toBe(0);
  });
  it("clamps between 0 and 100", () => {
    const score = calcCarbonScore({ gwpValue: "100" }, { baselineGwpPerUnit: "10" });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("calcComplianceScore", () => {
  it("returns 0 for no compliance features", () => {
    expect(calcComplianceScore({})).toBe(0);
  });
  it("adds 25 for fire rating", () => {
    expect(calcComplianceScore({ fireRating: "Class A" })).toBe(25);
  });
  it("ignores N/A fire rating", () => {
    expect(calcComplianceScore({ fireRating: "N/A" })).toBe(0);
  });
  it("adds 25 for Title 24", () => {
    expect(calcComplianceScore({ meetsTitle24: 1 })).toBe(25);
  });
  it("adds 25 for IECC", () => {
    expect(calcComplianceScore({ meetsIecc: 1 })).toBe(25);
  });
  it("adds points for ASTM standards array", () => {
    const score = calcComplianceScore({ astmStandards: JSON.stringify(["E84", "C518", "D1621"]) });
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(25);
  });
  it("returns 100 for all compliance features", () => {
    expect(calcComplianceScore({
      fireRating: "Class A",
      astmStandards: JSON.stringify(["E84", "C518", "D1621", "E96"]),
      meetsTitle24: 1,
      meetsIecc: 1,
    })).toBe(100);
  });
});

describe("calcCertificationScore", () => {
  it("returns 0 for no certifications", () => {
    expect(calcCertificationScore({})).toBe(0);
  });
  it("adds 20 for EPD", () => {
    expect(calcCertificationScore({ hasEpd: 1 })).toBe(20);
  });
  it("adds 15 for HPD", () => {
    expect(calcCertificationScore({ hasHpd: 1 })).toBe(15);
  });
  it("adds bonus for high recycled content", () => {
    expect(calcCertificationScore({ recycledContentPct: "60" })).toBeGreaterThan(calcCertificationScore({}));
  });
  it("caps at 100", () => {
    expect(calcCertificationScore({
      hasEpd: 1, hasHpd: 1, hasFsc: 1, hasC2c: 1, hasGreenguard: 1, hasDeclare: 1, recycledContentPct: "80",
    })).toBeLessThanOrEqual(100);
  });
});

describe("calcCostScore", () => {
  it("returns 100 for free material", () => {
    expect(calcCostScore({ pricePerUnit: "0" }, { baselinePricePerUnit: "10" })).toBe(100);
  });
  it("returns 100 for material at baseline price", () => {
    expect(calcCostScore({ pricePerUnit: "10" }, { baselinePricePerUnit: "10" })).toBe(100);
  });
  it("returns lower score for expensive material", () => {
    expect(calcCostScore({ pricePerUnit: "20" }, { baselinePricePerUnit: "10" })).toBeLessThan(100);
  });
  it("handles zero baseline (0 becomes 1 via fallback)", () => {
    // Number("0") || 1 = 1, so basePrice=1, ratio=5, score=max(0,100*(2-5))=max(0,-300)=0
    expect(calcCostScore({ pricePerUnit: "5" }, { baselinePricePerUnit: "0" })).toBe(0);
  });
});

describe("calcSupplyChainScore", () => {
  it("returns high score for US-made, short lead, local", () => {
    expect(calcSupplyChainScore(
      { leadTimeDays: 7, usManufactured: 1, regionalAvailabilityMiles: 200 },
      { baselineLeadTimeDays: 30 }
    )).toBeGreaterThanOrEqual(80);
  });
  it("returns lower score for imported, long lead", () => {
    expect(calcSupplyChainScore(
      { leadTimeDays: 90, usManufactured: 0, regionalAvailabilityMiles: 2000 },
      { baselineLeadTimeDays: 30 }
    )).toBeLessThan(50);
  });
  it("gives 30 points for US manufactured", () => {
    const withUs = calcSupplyChainScore({ usManufactured: 1, leadTimeDays: 30, regionalAvailabilityMiles: 2000 }, { baselineLeadTimeDays: 30 });
    const withoutUs = calcSupplyChainScore({ usManufactured: 0, leadTimeDays: 30, regionalAvailabilityMiles: 2000 }, { baselineLeadTimeDays: 30 });
    expect(withUs - withoutUs).toBe(30);
  });
});

describe("calcHealthScore", () => {
  it("returns 0 for worst health profile", () => {
    expect(calcHealthScore({ vocLevel: "high", onRedList: 1, hasTakeBackProgram: 0, hasGreenguard: 0 })).toBe(0);
  });
  it("returns high score for best health profile", () => {
    expect(calcHealthScore({ vocLevel: "none", onRedList: 0, hasTakeBackProgram: 1, hasGreenguard: 1 })).toBeGreaterThanOrEqual(85);
  });
  it("adds 40 for no VOC", () => {
    expect(calcHealthScore({ vocLevel: "none" })).toBeGreaterThanOrEqual(40);
  });
});

describe("calcSourcingDifficulty", () => {
  it("returns 1 for easy-to-source material", () => {
    expect(calcSourcingDifficulty({ leadTimeDays: 7, usManufactured: 1, hasEpd: 1 })).toBe(1);
  });
  it("returns higher difficulty for long lead, imported, no EPD", () => {
    expect(calcSourcingDifficulty({ leadTimeDays: 120, usManufactured: 0, hasEpd: 0 })).toBeGreaterThanOrEqual(4);
  });
  it("caps at 5", () => {
    expect(calcSourcingDifficulty({ leadTimeDays: 200, usManufactured: 0, hasEpd: 0 })).toBeLessThanOrEqual(5);
  });
});

describe("calculateCcps", () => {
  const goodMaterial = {
    gwpValue: "5", fireRating: "Class A", astmStandards: JSON.stringify(["E84", "C518"]),
    meetsTitle24: 1, meetsIecc: 1, hasEpd: 1, hasHpd: 1, hasFsc: 0, hasC2c: 0,
    hasGreenguard: 1, hasDeclare: 0, recycledContentPct: "40", pricePerUnit: "8",
    leadTimeDays: 14, usManufactured: 1, regionalAvailabilityMiles: 300,
    vocLevel: "low", onRedList: 0, hasTakeBackProgram: 1,
  };
  const baseline = { baselineGwpPerUnit: "10", baselinePricePerUnit: "10", baselineLeadTimeDays: 30 };

  it("returns a score between 0 and 100", () => {
    const r = calculateCcps(goodMaterial, baseline);
    expect(r.ccpsTotal).toBeGreaterThanOrEqual(0);
    expect(r.ccpsTotal).toBeLessThanOrEqual(100);
  });
  it("returns all 6 sub-scores plus sourcing difficulty", () => {
    const r = calculateCcps(goodMaterial, baseline);
    expect(r).toHaveProperty("carbonScore");
    expect(r).toHaveProperty("complianceScore");
    expect(r).toHaveProperty("certificationScore");
    expect(r).toHaveProperty("costScore");
    expect(r).toHaveProperty("supplyChainScore");
    expect(r).toHaveProperty("healthScore");
    expect(r).toHaveProperty("sourcingDifficulty");
  });
  it("bad material scores lower than good material", () => {
    const bad = { gwpValue: "50", pricePerUnit: "25", leadTimeDays: 120, usManufactured: 0, regionalAvailabilityMiles: 3000, vocLevel: "high", onRedList: 1 };
    expect(calculateCcps(goodMaterial, baseline).ccpsTotal).toBeGreaterThan(calculateCcps(bad, baseline).ccpsTotal);
  });
});

describe("personaToWeights", () => {
  it("returns default weights for empty persona", () => {
    const w = personaToWeights({});
    expect(w.carbonWeight).toBe(0.25);
    expect(w.complianceWeight).toBe(0.20);
  });
  it("uses persona values when provided", () => {
    const w = personaToWeights({ carbonWeight: "0.35", complianceWeight: "0.35" } as any);
    expect(w.carbonWeight).toBe(0.35);
    expect(w.complianceWeight).toBe(0.35);
  });
});

describe("calcCarbonDelta", () => {
  it("returns positive delta when alternative is lower carbon", () => {
    const r = calcCarbonDelta(1000, 700);
    expect(r.delta).toBe(300);
    expect(r.deltaPct).toBe(30);
  });
  it("returns negative delta when alternative is higher carbon", () => {
    const r = calcCarbonDelta(700, 1000);
    expect(r.delta).toBe(-300);
    expect(r.deltaPct).toBeCloseTo(-42.9, 0);
  });
  it("returns zero for identical materials", () => {
    const r = calcCarbonDelta(500, 500);
    expect(r.delta).toBe(0);
    expect(r.deltaPct).toBe(0);
  });
  it("handles zero original gracefully", () => {
    const r = calcCarbonDelta(0, 500);
    expect(r.delta).toBe(-500);
    expect(r.deltaPct).toBe(0);
  });
});

describe("calculateAssemblyLevelImpact", () => {
  it("rounds 166 * 92.903 to 15422 (architect EWS math)", () => {
    const result = calculateAssemblyLevelImpact({
      assemblyId: "EWS-1A",
      epdNumber: "4789733794.109.1",
      gwpPerFunctionalUnit: 166,
      msfFactor: 92.903,
    });
    expect(result.totalKgCO2ePer1000SF).toBe(15422);
  });

  it("preserves source fields in result", () => {
    const result = calculateAssemblyLevelImpact({
      assemblyId: "EWS-2B",
      epdNumber: "EPD-999",
      gwpPerFunctionalUnit: 100,
      msfFactor: 50,
    });
    expect(result.assemblyId).toBe("EWS-2B");
    expect(result.epdNumber).toBe("EPD-999");
    expect(result.gwpPerFunctionalUnit).toBe(100);
    expect(result.msfFactor).toBe(50);
    expect(result.totalKgCO2ePer1000SF).toBe(5000);
  });
});
