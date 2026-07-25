import { describe, expect, it } from "vitest";
import { carbonContext, isNonSustainableOption } from "./MaterialCard";

describe("isNonSustainableOption", () => {
  it("flags options without EPD data", () => {
    expect(isNonSustainableOption(80, false, null)).toBe(true);
  });

  it("flags options below preferred MCS threshold", () => {
    const nearAverageContext = carbonContext("90", "100");
    expect(isNonSustainableOption(59, true, nearAverageContext)).toBe(true);
  });

  it("flags options with above-average carbon profile", () => {
    const aboveAverageContext = carbonContext("130", "100");
    expect(isNonSustainableOption(80, true, aboveAverageContext)).toBe(true);
  });

  it("does not flag preferred options when carbon context is unavailable", () => {
    expect(isNonSustainableOption(80, true, null)).toBe(false);
  });
});

