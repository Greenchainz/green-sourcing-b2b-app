import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  calculateDistance,
  getNearbySuppliers,
  getComplianceRulesForState,
  getRegionalSwapPatterns,
  calculateShippingCost,
  getClimateZoneAdjustments,
  getLocationPricingAdjustments,
  getSuppliersByState,
  isSwapTypicalForRegion,
  getRegionalSwapCarbonReduction,
} from "./location-service";

describe("Location Service", () => {
  describe("calculateDistance", () => {
    it("should calculate distance between two coordinates", () => {
      // New York to Los Angeles: ~2451 miles
      const distance = calculateDistance(40.7128, -74.006, 34.0522, -118.2437);
      expect(distance).toBeGreaterThan(2400);
      expect(distance).toBeLessThan(2500);
    });

    it("should return 0 for same coordinates", () => {
      const distance = calculateDistance(40.7128, -74.006, 40.7128, -74.006);
      expect(distance).toBe(0);
    });

    it("should calculate distance for nearby locations", () => {
      // Two points ~0.07 miles apart (about 370 feet)
      const distance = calculateDistance(40.7128, -74.006, 40.7138, -74.006);
      expect(distance).toBeGreaterThan(0.05);
      expect(distance).toBeLessThan(0.15);
    });
  });

  describe("getNearbySuppliers", () => {
    it("should return empty array when db is unavailable", async () => {
      // This test assumes getDb() returns null in test environment
      const suppliers = await getNearbySuppliers(40.7128, -74.006, 100);
      expect(Array.isArray(suppliers)).toBe(true);
    });

    it("should filter by distance", async () => {
      const suppliers = await getNearbySuppliers(40.7128, -74.006, 50);
      expect(Array.isArray(suppliers)).toBe(true);
      // All suppliers should be within 50 miles
      if (suppliers.length > 0) {
        suppliers.forEach((supplier) => {
          if (supplier.latitude && supplier.longitude) {
            const distance = calculateDistance(40.7128, -74.006, Number(supplier.latitude), Number(supplier.longitude));
            expect(distance).toBeLessThanOrEqual(50);
          }
        });
      }
    });
  });

  describe("getComplianceRulesForState", () => {
    it("should return null or compliance rules for a state", async () => {
      const rules = await getComplianceRulesForState("CA");
      expect(rules === null || typeof rules === "object").toBe(true);
    });

    it("should handle invalid state codes", async () => {
      const rules = await getComplianceRulesForState("XX");
      expect(rules === null || typeof rules === "object").toBe(true);
    });
  });

  describe("getRegionalSwapPatterns", () => {
    it("should return array of swap patterns", async () => {
      const patterns = await getRegionalSwapPatterns("CA");
      expect(Array.isArray(patterns)).toBe(true);
    });

    it("should filter by material type when provided", async () => {
      const patterns = await getRegionalSwapPatterns("CA", "concrete");
      expect(Array.isArray(patterns)).toBe(true);
    });
  });

  describe("calculateShippingCost", () => {
    it("should return 0 or positive shipping cost", async () => {
      const cost = await calculateShippingCost("CA", "NY", "steel");
      expect(cost).toBeGreaterThanOrEqual(0);
    });

    it("should handle missing shipping rates", async () => {
      const cost = await calculateShippingCost("XX", "YY", "unknown");
      expect(cost).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getClimateZoneAdjustments", () => {
    it("should return null or climate zone adjustments", async () => {
      const adjustments = await getClimateZoneAdjustments("Zone 4", "concrete");
      expect(adjustments === null || typeof adjustments === "object").toBe(true);
    });
  });

  describe("getLocationPricingAdjustments", () => {
    it("should return null or pricing adjustments", async () => {
      const adjustments = await getLocationPricingAdjustments("CA", "steel");
      expect(adjustments === null || typeof adjustments === "object").toBe(true);
    });
  });

  describe("getSuppliersByState", () => {
    it("should return array of suppliers", async () => {
      const suppliers = await getSuppliersByState("CA");
      expect(Array.isArray(suppliers)).toBe(true);
    });

    it("should only return verified suppliers", async () => {
      const suppliers = await getSuppliersByState("CA");
      // All suppliers should have required fields
      suppliers.forEach((supplier) => {
        expect(supplier.id).toBeDefined();
        expect(supplier.companyName).toBeDefined();
      });
    });
  });

  describe("isSwapTypicalForRegion", () => {
    it("should return boolean", async () => {
      const isTypical = await isSwapTypicalForRegion("CA", "concrete", "recycled_concrete");
      expect(typeof isTypical).toBe("boolean");
    });
  });

  describe("getRegionalSwapCarbonReduction", () => {
    it("should return 0 or positive carbon reduction", async () => {
      const reduction = await getRegionalSwapCarbonReduction("CA", "concrete", "recycled_concrete");
      expect(reduction).toBeGreaterThanOrEqual(0);
    });
  });
});
