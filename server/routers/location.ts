import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
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
} from "../location-service";

export const locationRouter = router({
  /**
   * Haversine distance between two coordinates (no DB, no auth required)
   */
  distance: publicProcedure
    .input(
      z.object({
        lat1: z.number(),
        lon1: z.number(),
        lat2: z.number(),
        lon2: z.number(),
      })
    )
    .query(({ input }) => {
      return { distanceMiles: calculateDistance(input.lat1, input.lon1, input.lat2, input.lon2) };
    }),

  /**
   * Suppliers within a radius of a given coordinate
   */
  nearbySuppliers: protectedProcedure
    .input(
      z.object({
        latitude: z.number(),
        longitude: z.number(),
        radiusMiles: z.number().min(1).max(500).default(100),
        certifications: z.array(z.string()).optional(),
        materialTypes: z.array(z.string()).optional(),
      })
    )
    .query(({ input }) => {
      return getNearbySuppliers(input.latitude, input.longitude, input.radiusMiles, {
        certifications: input.certifications,
        materialTypes: input.materialTypes,
      });
    }),

  /**
   * All verified suppliers in a US state
   */
  suppliersByState: protectedProcedure
    .input(z.object({ state: z.string().length(2) }))
    .query(({ input }) => getSuppliersByState(input.state)),

  /**
   * State-specific building code compliance rules
   */
  complianceRules: protectedProcedure
    .input(z.object({ state: z.string().length(2) }))
    .query(({ input }) => getComplianceRulesForState(input.state)),

  /**
   * Historical swap approval patterns for a state + optional material
   */
  regionalSwapPatterns: protectedProcedure
    .input(
      z.object({
        state: z.string().length(2),
        materialType: z.string().optional(),
      })
    )
    .query(({ input }) => getRegionalSwapPatterns(input.state, input.materialType)),

  /**
   * Whether a material swap is common in a given state (approval rate > 10%)
   */
  isSwapTypical: protectedProcedure
    .input(
      z.object({
        state: z.string().length(2),
        fromMaterial: z.string(),
        toMaterial: z.string(),
      })
    )
    .query(({ input }) => isSwapTypicalForRegion(input.state, input.fromMaterial, input.toMaterial)),

  /**
   * Average carbon reduction for a swap in a region
   */
  swapCarbonReduction: protectedProcedure
    .input(
      z.object({
        state: z.string().length(2),
        fromMaterial: z.string(),
        toMaterial: z.string(),
      })
    )
    .query(({ input }) => getRegionalSwapCarbonReduction(input.state, input.fromMaterial, input.toMaterial)),

  /**
   * Shipping cost per unit between two states for a material type
   */
  shippingCost: protectedProcedure
    .input(
      z.object({
        originState: z.string().length(2),
        destinationState: z.string().length(2),
        materialType: z.string(),
      })
    )
    .query(({ input }) =>
      calculateShippingCost(input.originState, input.destinationState, input.materialType).then((cost) => ({ costPerUnit: cost }))
    ),

  /**
   * Material durability/R-value/carbon multipliers for a climate zone
   */
  climateZoneAdjustments: protectedProcedure
    .input(
      z.object({
        climateZone: z.string(),
        materialType: z.string(),
      })
    )
    .query(({ input }) => getClimateZoneAdjustments(input.climateZone, input.materialType)),

  /**
   * State + material price multiplier (regional cost of labor/transport)
   */
  pricingAdjustments: protectedProcedure
    .input(
      z.object({
        state: z.string().length(2),
        materialType: z.string(),
      })
    )
    .query(({ input }) => getLocationPricingAdjustments(input.state, input.materialType)),
});
