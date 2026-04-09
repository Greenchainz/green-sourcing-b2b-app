import { describe, it, expect } from "vitest";
import { fetchEC3EPDs, searchEC3EPDs, fetchEC3Categories, parseGWP } from "./ec3";

const hasEC3Credentials = !!(
  process.env.EC3_API_KEY ||
  (process.env.EC3_USERNAME && process.env.EC3_PASSWORD)
);

describe("EC3 API Integration", () => {
  it.skipIf(!hasEC3Credentials)("should fetch EPDs from EC3 API with valid credentials", async () => {
    const epds = await fetchEC3EPDs(undefined, 10);
    
    expect(Array.isArray(epds)).toBe(true);
    
    if (epds.length > 0) {
      const firstEPD = epds[0];
      expect(firstEPD).toHaveProperty("id");
      expect(firstEPD).toHaveProperty("gwp");
      expect(firstEPD).toHaveProperty("category");
    }
  }, 30000);

  it.skipIf(!hasEC3Credentials)("should search for concrete EPDs", async () => {
    const results = await searchEC3EPDs("concrete", 10);
    
    expect(Array.isArray(results)).toBe(true);
    if (results.length > 0) {
      const firstResult = results[0];
      expect(firstResult).toHaveProperty("id");
      expect(firstResult).toHaveProperty("gwp");
      expect(firstResult).toHaveProperty("category");
    }
  }, 30000);

  it("should parse GWP strings correctly", () => {
    expect(parseGWP("339 kgCO2e")).toBe(339);
    expect(parseGWP("1234.56 kgCO2e")).toBe(1234.56);
    expect(parseGWP("0 kgCO2e")).toBe(0);
  });
});
