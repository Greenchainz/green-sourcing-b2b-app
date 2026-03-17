import { describe, it, expect } from "vitest";
import { geocodeAddress, calculateDistance } from "./azure-maps-service";

describe("Azure Maps Service", () => {
  it("should geocode a valid address", async () => {
    const result = await geocodeAddress("1600 Amphitheatre Parkway, Mountain View, CA");
    
    expect(result).toBeDefined();
    expect(result).not.toBeNull();
    
    if (result) {
      expect(result.latitude).toBeTypeOf("number");
      expect(result.longitude).toBeTypeOf("number");
      // Mountain View, CA should be around these coordinates
      expect(result.latitude).toBeGreaterThan(37);
      expect(result.latitude).toBeLessThan(38);
      expect(result.longitude).toBeGreaterThan(-123);
      expect(result.longitude).toBeLessThan(-121);
    }
  }, 10000); // 10 second timeout for API call

  it("should calculate distance between two coordinates", async () => {
    // San Francisco to Los Angeles (approx 380 miles)
    const sf = { latitude: 37.7749, longitude: -122.4194 };
    const la = { latitude: 34.0522, longitude: -118.2437 };
    
    const result = await calculateDistance(sf, la);
    
    expect(result).toBeDefined();
    expect(result).not.toBeNull();
    
    if (result) {
      expect(result.distanceMiles).toBeGreaterThan(300);
      expect(result.distanceMiles).toBeLessThan(450);
      expect(result.durationMinutes).toBeGreaterThan(0);
    }
  }, 10000);

  it("should return null for invalid address", async () => {
    const result = await geocodeAddress("INVALID_ADDRESS_12345_XYZ");
    expect(result).toBeNull();
  });
});
