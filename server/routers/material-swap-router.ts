import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { materials, materialSpecs } from "../../drizzle/schema";
import { and, eq, gte, lte, like, or, sql } from "drizzle-orm";

export const materialSwapRouter = router({
  /**
   * Search materials by name, category, or carbon range
   */
  search: publicProcedure
    .input(
      z.object({
        query: z.string().optional(),
        category: z.string().optional(),
        minGwp: z.number().optional(),
        maxGwp: z.number().optional(),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      const conditions = [];

      if (input.query) {
        conditions.push(
          or(
            like(materials.name, `%${input.query}%`),
            like(materials.description, `%${input.query}%`)
          )
        );
      }

      if (input.category) {
        conditions.push(eq(materials.category, input.category));
      }

      // Parse GWP from string format "350 kgCO2e" to number
      if (input.minGwp !== undefined || input.maxGwp !== undefined) {
        // We'll filter in memory since GWP is stored as string
      }

      const results = await db
        .select()
        .from(materials)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(input.limit);

      // Filter by GWP range if specified
      let filtered = results;
      if (input.minGwp !== undefined || input.maxGwp !== undefined) {
        filtered = results.filter((m: typeof results[0]) => {
          if (!m.gwpValue) return false;
          const gwpMatch = m.gwpValue.match(/(\d+\.?\d*)/);
          if (!gwpMatch) return false;
          const gwpValue = parseFloat(gwpMatch[1]);
          if (input.minGwp !== undefined && gwpValue < input.minGwp) return false;
          if (input.maxGwp !== undefined && gwpValue > input.maxGwp) return false;
          return true;
        });
      }

      return filtered;
    }),

  /**
   * Find alternative materials (swaps) based on constraints
   */
  findSwaps: publicProcedure
    .input(
      z.object({
        materialId: z.number(),
        maxGwpIncrease: z.number().default(0), // Max % increase in GWP (negative = must be lower)
        minFireRating: z.string().optional(),
        minRValue: z.string().optional(),
        maxPriceIncrease: z.number().optional(), // Max % increase in price
        maxLeadTimeDays: z.number().optional(),
        regionalAvailabilityMiles: z.number().optional(),
        requiredCertifications: z.array(z.string()).optional(),
        limit: z.number().default(10),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      // Get the original material
      const [original] = await db
        .select()
        .from(materials)
        .where(eq(materials.id, input.materialId));

      if (!original) {
        throw new Error("Material not found");
      }

      // Parse original GWP
      const originalGwpMatch = original.gwpValue?.match(/(\d+\.?\d*)/);
      const originalGwp = originalGwpMatch ? parseFloat(originalGwpMatch[1]) : null;

      // Find materials in the same category
      const candidates = await db
        .select()
        .from(materials)
        .where(
          and(
            eq(materials.category, original.category),
            sql`${materials.id} != ${input.materialId}`
          )
        )
        .limit(100); // Get more candidates for filtering

      // Filter candidates by constraints
      const swaps = candidates.filter((candidate: typeof candidates[0]) => {
        // GWP constraint
        if (originalGwp && candidate.gwpValue) {
          const candidateGwpMatch = candidate.gwpValue.match(/(\d+\.?\d*)/);
          if (!candidateGwpMatch) return false;
          const candidateGwp = parseFloat(candidateGwpMatch[1]);
          const gwpIncrease = ((candidateGwp - originalGwp) / originalGwp) * 100;
          if (gwpIncrease > input.maxGwpIncrease) return false;
        }

        // Fire rating constraint (simplified - would need proper comparison logic)
        if (input.minFireRating && candidate.fireRating) {
          // For now, just check if it exists
          if (!candidate.fireRating) return false;
        }

        // R-value constraint (simplified)
        if (input.minRValue && candidate.rValue) {
          // For now, just check if it exists
          if (!candidate.rValue) return false;
        }

        // Lead time constraint
        if (input.maxLeadTimeDays && candidate.leadTimeDays) {
          if (candidate.leadTimeDays > input.maxLeadTimeDays) return false;
        }

        // Regional availability constraint
        if (input.regionalAvailabilityMiles && candidate.regionalAvailabilityMiles) {
          if (candidate.regionalAvailabilityMiles > input.regionalAvailabilityMiles)
            return false;
        }

        // Certifications constraint
        if (input.requiredCertifications && input.requiredCertifications.length > 0) {
          const hasCerts = input.requiredCertifications.every((cert) => {
            switch (cert.toLowerCase()) {
              case "leed":
                return candidate.hasEpd;
              case "declare":
                return candidate.hasDeclare;
              case "hpd":
                return candidate.hasHpd;
              case "fsc":
                return candidate.hasFsc;
              case "c2c":
                return candidate.hasC2c;
              case "greenguard":
                return candidate.hasGreenguard;
              default:
                return true;
            }
          });
          if (!hasCerts) return false;
        }

        return true;
      });

      // Sort by GWP (lowest first)
      const sorted = swaps.sort((a: typeof candidates[0], b: typeof candidates[0]) => {
        const aGwpMatch = a.gwpValue?.match(/(\d+\.?\d*)/);
        const bGwpMatch = b.gwpValue?.match(/(\d+\.?\d*)/);
        const aGwp = aGwpMatch ? parseFloat(aGwpMatch[1]) : Infinity;
        const bGwp = bGwpMatch ? parseFloat(bGwpMatch[1]) : Infinity;
        return aGwp - bGwp;
      });

      return {
        original,
        swaps: sorted.slice(0, input.limit),
      };
    }),

  /**
   * Compare CCPS scorecard between two materials
   */
  compareScorecard: publicProcedure
    .input(
      z.object({
        materialId1: z.number(),
        materialId2: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      const [material1, material2] = await Promise.all([
        db.select().from(materials).where(eq(materials.id, input.materialId1)),
        db.select().from(materials).where(eq(materials.id, input.materialId2)),
      ]);

      if (!material1[0] || !material2[0]) {
        throw new Error("One or both materials not found");
      }

      // Get material specs for both materials
      const [specs1, specs2] = await Promise.all([
        db
          .select()
          .from(materialSpecs)
          .where(
            and(
              eq(materialSpecs.materialId, input.materialId1),
              eq(materialSpecs.status, "approved")
            )
          )
          .limit(1),
        db
          .select()
          .from(materialSpecs)
          .where(
            and(
              eq(materialSpecs.materialId, input.materialId2),
              eq(materialSpecs.status, "approved")
            )
          )
          .limit(1),
      ]);

      const parseGwp = (gwp: string | null): number | null => {
        if (!gwp) return null;
        const match = gwp.match(/(\d+\.?\d*)/);
        return match ? parseFloat(match[1]) : null;
      };

      const gwp1 = parseGwp(material1[0].gwpValue);
      const gwp2 = parseGwp(material2[0].gwpValue);

      return {
        material1: {
          ...material1[0],
          specs: specs1[0] || null,
          scorecard: {
            carbon: {
              gwp: gwp1,
              grade: gwp1 ? (gwp1 < 300 ? "A" : gwp1 < 500 ? "B" : "C") : null,
            },
            compliance: {
              fireRating: material1[0].fireRating || specs1[0]?.fireRating,
              rValue: material1[0].rValue || specs1[0]?.rValue,
              meetsTitle24: material1[0].meetsTitle24 || specs1[0]?.meetsTitle24,
              meetsIecc: material1[0].meetsIecc || specs1[0]?.meetsIecc,
            },
            certifications: {
              hasEpd: material1[0].hasEpd || specs1[0]?.hasEpd,
              hasDeclare: material1[0].hasDeclare || specs1[0]?.hasDeclare,
              hasHpd: material1[0].hasHpd || specs1[0]?.hasHpd,
              hasFsc: material1[0].hasFsc || specs1[0]?.hasFsc,
              hasC2c: material1[0].hasC2c || specs1[0]?.hasC2c,
              hasGreenguard: material1[0].hasGreenguard || specs1[0]?.hasGreenguard,
            },
            cost: {
              pricePerUnit: material1[0].pricePerUnit || specs1[0]?.pricePerUnit,
              priceUnit: material1[0].priceUnit || specs1[0]?.priceUnit,
              leadTimeDays: material1[0].leadTimeDays || specs1[0]?.leadTimeDays,
            },
            supplyChain: {
              usManufactured: material1[0].usManufactured || specs1[0]?.usManufactured,
              regionalAvailabilityMiles:
                material1[0].regionalAvailabilityMiles ||
                specs1[0]?.regionalAvailabilityMiles,
              inStock: specs1[0]?.inStock,
              shippingRegions: specs1[0]?.shippingRegions,
            },
            health: {
              vocLevel: material1[0].vocLevel || specs1[0]?.vocLevel,
              vocCertification:
                material1[0].vocCertification || specs1[0]?.vocCertification,
              onRedList: material1[0].onRedList,
            },
          },
        },
        material2: {
          ...material2[0],
          specs: specs2[0] || null,
          scorecard: {
            carbon: {
              gwp: gwp2,
              grade: gwp2 ? (gwp2 < 300 ? "A" : gwp2 < 500 ? "B" : "C") : null,
            },
            compliance: {
              fireRating: material2[0].fireRating || specs2[0]?.fireRating,
              rValue: material2[0].rValue || specs2[0]?.rValue,
              meetsTitle24: material2[0].meetsTitle24 || specs2[0]?.meetsTitle24,
              meetsIecc: material2[0].meetsIecc || specs2[0]?.meetsIecc,
            },
            certifications: {
              hasEpd: material2[0].hasEpd || specs2[0]?.hasEpd,
              hasDeclare: material2[0].hasDeclare || specs2[0]?.hasDeclare,
              hasHpd: material2[0].hasHpd || specs2[0]?.hasHpd,
              hasFsc: material2[0].hasFsc || specs2[0]?.hasFsc,
              hasC2c: material2[0].hasC2c || specs2[0]?.hasC2c,
              hasGreenguard: material2[0].hasGreenguard || specs2[0]?.hasGreenguard,
            },
            cost: {
              pricePerUnit: material2[0].pricePerUnit || specs2[0]?.pricePerUnit,
              priceUnit: material2[0].priceUnit || specs2[0]?.priceUnit,
              leadTimeDays: material2[0].leadTimeDays || specs2[0]?.leadTimeDays,
            },
            supplyChain: {
              usManufactured: material2[0].usManufactured || specs2[0]?.usManufactured,
              regionalAvailabilityMiles:
                material2[0].regionalAvailabilityMiles ||
                specs2[0]?.regionalAvailabilityMiles,
              inStock: specs2[0]?.inStock,
              shippingRegions: specs2[0]?.shippingRegions,
            },
            health: {
              vocLevel: material2[0].vocLevel || specs2[0]?.vocLevel,
              vocCertification:
                material2[0].vocCertification || specs2[0]?.vocCertification,
              onRedList: material2[0].onRedList,
            },
          },
        },
        comparison: {
          carbonSavings: gwp1 && gwp2 ? ((gwp1 - gwp2) / gwp1) * 100 : null,
          priceDifference:
            material1[0].pricePerUnit && material2[0].pricePerUnit
              ? parseFloat(material2[0].pricePerUnit) -
                parseFloat(material1[0].pricePerUnit)
              : null,
          leadTimeDifference:
            material1[0].leadTimeDays && material2[0].leadTimeDays
              ? material2[0].leadTimeDays - material1[0].leadTimeDays
              : null,
        },
      };
    }),

  /**
   * Get AI-powered swap recommendations
   */
  getSwapRecommendations: publicProcedure
    .input(
      z.object({
        materialId: z.number(),
        projectRequirements: z.string().optional(), // Natural language description
        prioritizeCarbon: z.boolean().default(true),
        prioritizeCost: z.boolean().default(false),
        limit: z.number().default(5),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      // Get the original material
      const [original] = await db
        .select()
        .from(materials)
        .where(eq(materials.id, input.materialId));

      if (!original) {
        throw new Error("Material not found");
      }

      // Find potential swaps (same category, lower or similar GWP)
      const candidates = await db
        .select()
        .from(materials)
        .where(
          and(
            eq(materials.category, original.category),
            sql`${materials.id} != ${input.materialId}`
          )
        )
        .limit(20);

      // Parse GWP for sorting
      const parseGwp = (gwp: string | null): number => {
        if (!gwp) return Infinity;
        const match = gwp.match(/(\d+\.?\d*)/);
        return match ? parseFloat(match[1]) : Infinity;
      };

      // Sort by priority
      const sorted = candidates.sort((a: typeof candidates[0], b: typeof candidates[0]) => {
        if (input.prioritizeCarbon) {
          return parseGwp(a.gwpValue) - parseGwp(b.gwpValue);
        } else if (input.prioritizeCost) {
          const aPrice = a.pricePerUnit ? parseFloat(a.pricePerUnit) : Infinity;
          const bPrice = b.pricePerUnit ? parseFloat(b.pricePerUnit) : Infinity;
          return aPrice - bPrice;
        }
        return 0;
      });

      const recommendations = sorted.slice(0, input.limit).map((candidate: typeof candidates[0]) => {
        const originalGwp = parseGwp(original.gwpValue);
        const candidateGwp = parseGwp(candidate.gwpValue);
        const carbonSavings =
          originalGwp !== Infinity && candidateGwp !== Infinity
            ? ((originalGwp - candidateGwp) / originalGwp) * 100
            : null;

        return {
          material: candidate,
          score: carbonSavings || 0,
          reason: carbonSavings
            ? `${carbonSavings.toFixed(1)}% carbon reduction`
            : "Similar carbon footprint",
          tradeoffs: [],
        };
      });

      return {
        original,
        recommendations,
      };
    }),
});
