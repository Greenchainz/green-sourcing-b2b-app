import { describe, expect, it } from "vitest";
import { evaluateEpdValidity, SCORE_POLICY } from "./epd-validity-policy";

describe("epd-validity-policy", () => {
  it("marks missing expiry as unusable", () => {
    const result = evaluateEpdValidity(null, new Date("2026-01-01T00:00:00.000Z"));
    expect(result.status).toBe("missing");
    expect(result.isUsableForScoring).toBe(false);
  });

  it("marks expired EPD as unusable", () => {
    const result = evaluateEpdValidity("2025-12-30T00:00:00.000Z", new Date("2026-01-01T00:00:00.000Z"));
    expect(result.status).toBe("expired");
    expect(result.isUsableForScoring).toBe(false);
  });

  it("marks near-term expiry as warning but usable", () => {
    const result = evaluateEpdValidity("2026-02-01T00:00:00.000Z", new Date("2026-01-01T00:00:00.000Z"));
    expect(result.status).toBe("expiring_soon");
    expect(result.isUsableForScoring).toBe(true);
    expect(result.daysUntilExpiry).toBeLessThan(SCORE_POLICY.epdWarningDays);
  });

  it("marks long-valid EPD as valid and usable", () => {
    const result = evaluateEpdValidity("2027-01-01T00:00:00.000Z", new Date("2026-01-01T00:00:00.000Z"));
    expect(result.status).toBe("valid");
    expect(result.isUsableForScoring).toBe(true);
    expect(result.daysUntilExpiry).toBeGreaterThanOrEqual(SCORE_POLICY.epdWarningDays);
  });
});

