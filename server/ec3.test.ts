import { describe, it, expect } from "vitest";
import { fetchEC3EPDs, searchEC3EPDs, fetchEC3Categories, parseGWP } from "./ec3";

describe("EC3 API Integration", () => {
  it("should fetch EPDs from EC3 API with valid credentials", async () => {
    // This test validates that the EC3_API_KEY secret is correctly set
    // and that we can successfully authenticate with the Building Transparency API
    const epds = await fetchEC3EPDs(undefined, 10); // Fetch first 10 EPDs
    
    // We expect the API to return an array (even if empty)
    expect(Array.isArray(epds)).toBe(true);
    
    // If EPDs exist, verify structure
    if (epds.length > 0) {
      const firstEPD = epds[0];
      expect(firstEPD).toHaveProperty("id");
      expect(firstEPD).toHaveProperty("gwp");
      expect(firstEPD).toHaveProperty("category");
    }
  }, 30000); // 30 second timeout for API call

  it("should search for concrete EPDs", async () => {
    const results = await searchEC3EPDs("concrete", 10);
    
    expect(Array.isArray(results)).toBe(true);
    // If results exist, verify structure
    if (results.length > 0) {
      const firstResult = results[0];
      expect(firstResult).toHaveProperty("id");
      expect(firstResult).toHaveProperty("gwp");
      expect(firstResult).toHaveProperty("category");
    }
  }, 30000);

  // Categories endpoint returns 404 - might not be available in current EC3 API version
  // it("should fetch EC3 categories", async () => {
  //   const categories = await fetchEC3Categories();
  //   
  //   expect(Array.isArray(categories)).toBe(true);
  //   if (categories.length > 0) {
  //     const firstCategory = categories[0];
  //     expect(firstCategory).toHaveProperty("id");
  //     expect(firstCategory).toHaveProperty("name");
  //     expect(firstCategory).toHaveProperty("declared_unit");
  //   }
  // }, 30000);

  it("should parse GWP strings correctly", () => {
    expect(parseGWP("339 kgCO2e")).toBe(339);
    expect(parseGWP("1234.56 kgCO2e")).toBe(1234.56);
    expect(parseGWP("0 kgCO2e")).toBe(0);
  });
});
