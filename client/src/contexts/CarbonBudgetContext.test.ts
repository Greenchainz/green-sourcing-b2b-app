import { describe, expect, it } from "vitest";
import { calcLeedPoints } from "./CarbonBudgetContext";

describe("calcLeedPoints", () => {
  // ── Zero-reduction / below-baseline case ──────────────────────────────────
  // When pctBelowBaseline is null (no items with an EC3 median), the provider
  // short-circuits and returns leedPoints = 0 without calling calcLeedPoints.
  // calcLeedPoints(0) covers the "exactly at baseline" boundary (no reduction).
  it("returns 0 when pct is 0 (no reduction vs baseline)", () => {
    expect(calcLeedPoints(0)).toBe(0);
  });

  it("returns 0 when pct is negative (above baseline)", () => {
    expect(calcLeedPoints(-5)).toBe(0);
  });

  // ── Threshold boundaries ─────────────────────────────────────────────────

  it("returns 0 just below the 10% threshold", () => {
    expect(calcLeedPoints(9.9)).toBe(0);
  });

  it("returns 1 at exactly 10%", () => {
    expect(calcLeedPoints(10)).toBe(1);
  });

  it("returns 1 just below the 20% threshold", () => {
    expect(calcLeedPoints(19.9)).toBe(1);
  });

  it("returns 2 at exactly 20%", () => {
    expect(calcLeedPoints(20)).toBe(2);
  });

  it("returns 2 just below the 30% threshold", () => {
    expect(calcLeedPoints(29.9)).toBe(2);
  });

  it("returns 3 at exactly 30%", () => {
    expect(calcLeedPoints(30)).toBe(3);
  });

  it("returns 3 just below the 40% threshold", () => {
    expect(calcLeedPoints(39.9)).toBe(3);
  });

  it("returns 4 at exactly 40%", () => {
    expect(calcLeedPoints(40)).toBe(4);
  });

  it("returns 4 just below the 50% threshold", () => {
    expect(calcLeedPoints(49.9)).toBe(4);
  });

  it("returns 5 at exactly 50%", () => {
    expect(calcLeedPoints(50)).toBe(5);
  });

  it("returns 5 above 50% (no extra points beyond maximum)", () => {
    expect(calcLeedPoints(75)).toBe(5);
  });
});
