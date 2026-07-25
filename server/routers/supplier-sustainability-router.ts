/**
 * Supplier Sustainability Router
 *
 * Manages a supplier's sustainability data profile — the Data Ladder inputs
 * that inform the L0–L3 quality level shown on RFQ comparisons.
 *
 * Procedures:
 *   getMyProfile    — Supplier retrieves their own profile (creates if missing)
 *   saveProfile     — Partial upsert — no fields required, progress is preserved
 *   runCalculator   — Compute Scope 1+2 from energy bill inputs (no DB write)
 *   saveCalculator  — Run calculator + persist result to the profile
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  suppliers,
  supplierSustainabilityProfiles,
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  inferDataQualityLevel,
  type DataSourceType,
} from "../lib/sustainability-data-quality";
import {
  calculateEmissions,
  type EmissionsCalculatorInput,
} from "../services/emissions-calculator";

// ─── Shared input schemas ─────────────────────────────────────────────────────

const calculatorInputSchema = z.object({
  electricityKwh:   z.number().nonnegative().optional(),
  naturalGasMmbtu:  z.number().nonnegative().optional(),
  dieselGallons:    z.number().nonnegative().optional(),
  annualRevenue:    z.number().nonnegative().optional(),
});

const profileUpdateSchema = z.object({
  hasEpd:           z.boolean().optional(),
  epdReference:     z.string().max(1000).optional(),
  certifications:   z.array(z.string().max(100)).max(20).optional(),
  electricityKwh:   z.number().nonnegative().optional(),
  naturalGasMmbtu:  z.number().nonnegative().optional(),
  dieselGallons:    z.number().nonnegative().optional(),
  annualRevenue:    z.number().nonnegative().optional(),
  // Suppliers can override their data source type
  dataSourceType:   z.enum([
    "none", "industry_average", "spend_based",
    "energy_bill", "supplier_self_reported", "third_party_verified", "epd",
  ] as const).optional(),
});

// ─── Helper ───────────────────────────────────────────────────────────────────

async function resolveVerifiedSupplierId(userId: number): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select({ id: suppliers.id })
    .from(suppliers)
    .where(eq(suppliers.userId, userId))
    .limit(1);
  return row?.id ?? null;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const supplierSustainabilityRouter = router({

  /**
   * Retrieve the authenticated supplier's sustainability profile.
   * Creates an empty profile row if one doesn't exist yet.
   * Returns null if the user has no supplier record.
   */
  getMyProfile: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const supplierId = await resolveVerifiedSupplierId(ctx.user.id);
      if (supplierId == null) return null;

      // Return existing or create empty profile
      const [existing] = await db
        .select()
        .from(supplierSustainabilityProfiles)
        .where(eq(supplierSustainabilityProfiles.supplierId, supplierId))
        .limit(1);

      if (existing) return existing;

      // Auto-create skeleton profile (all defaults, no emissions data)
      const [created] = await db
        .insert(supplierSustainabilityProfiles)
        .values({
          supplierId,
          dataQualityLevel: "L0",
          lastUpdatedBy: ctx.user.id,
        })
        .returning();

      return created;
    }),

  /**
   * Partial upsert of the supplier's sustainability profile.
   * Any subset of fields may be provided — omitted fields are preserved.
   * Automatically re-infers dataQualityLevel and calculationMethod from
   * the combined persisted state after the update.
   */
  saveProfile: protectedProcedure
    .input(profileUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const supplierId = await resolveVerifiedSupplierId(ctx.user.id);
      if (supplierId == null) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No supplier profile found" });
      }

      // Fetch current state for quality inference
      const [current] = await db
        .select()
        .from(supplierSustainabilityProfiles)
        .where(eq(supplierSustainabilityProfiles.supplierId, supplierId))
        .limit(1);

      // Merge new values with existing for quality inference
      const merged = {
        hasEpd:          input.hasEpd          ?? current?.hasEpd          ?? false,
        epdReference:    input.epdReference     ?? current?.epdReference     ?? null,
        dataSourceType:  input.dataSourceType   ?? current?.dataSourceType  ?? null,
        electricityKwh:  input.electricityKwh   ?? (current?.electricityKwh   ? parseFloat(current.electricityKwh)  : null),
        naturalGasMmbtu: input.naturalGasMmbtu  ?? (current?.naturalGasMmbtu  ? parseFloat(current.naturalGasMmbtu) : null),
        dieselGallons:   input.dieselGallons    ?? (current?.dieselGallons    ? parseFloat(current.dieselGallons)   : null),
      };

      // Infer data quality level from combined state
      let dataQualityLevel: "L0" | "L1" | "L2" | "L3";
      if (merged.hasEpd && merged.epdReference) {
        dataQualityLevel = "L3";
      } else if (merged.hasEpd) {
        dataQualityLevel = "L3";
      } else if (merged.dataSourceType) {
        dataQualityLevel = inferDataQualityLevel(merged.dataSourceType as DataSourceType);
      } else {
        const hasEnergy = (merged.electricityKwh ?? 0) > 0 ||
                          (merged.naturalGasMmbtu ?? 0) > 0 ||
                          (merged.dieselGallons ?? 0) > 0;
        dataQualityLevel = hasEnergy ? "L1" : "L0";
      }

      // Build strongly-typed update set — Drizzle requires the exact column types
      const updateSet = {
        dataQualityLevel,
        lastUpdatedBy: ctx.user.id,
        updatedAt:     new Date(),
        ...(input.hasEpd         !== undefined && { hasEpd:         input.hasEpd }),
        ...(input.epdReference   !== undefined && { epdReference:   input.epdReference }),
        ...(input.certifications !== undefined && { certifications: input.certifications }),
        ...(input.dataSourceType !== undefined && { dataSourceType: input.dataSourceType }),
        ...(input.electricityKwh  !== undefined && { electricityKwh:  input.electricityKwh.toString() }),
        ...(input.naturalGasMmbtu !== undefined && { naturalGasMmbtu: input.naturalGasMmbtu.toString() }),
        ...(input.dieselGallons   !== undefined && { dieselGallons:   input.dieselGallons.toString() }),
        ...(input.annualRevenue   !== undefined && { annualRevenue:   input.annualRevenue.toString() }),
      };

      if (current) {
        await db
          .update(supplierSustainabilityProfiles)
          .set(updateSet)
          .where(eq(supplierSustainabilityProfiles.supplierId, supplierId));
      } else {
        await db
          .insert(supplierSustainabilityProfiles)
          .values({ supplierId, ...updateSet });
      }

      return { ok: true, dataQualityLevel };
    }),

  /**
   * Run the Scope 1+2 emissions calculator — no DB write.
   * Returns calculated emissions and quality level for preview in the UI.
   * Call saveCalculator to persist the result.
   */
  runCalculator: protectedProcedure
    .input(calculatorInputSchema)
    .query(({ input }) => {
      const calcInput: EmissionsCalculatorInput = {
        electricityKwh:  input.electricityKwh,
        naturalGasMmbtu: input.naturalGasMmbtu,
        dieselGallons:   input.dieselGallons,
        annualRevenue:   input.annualRevenue,
      };
      return calculateEmissions(calcInput);
    }),

  /**
   * Run the calculator and immediately persist the result to the profile.
   * Also sets calculationMethod and re-derives dataQualityLevel.
   */
  saveCalculator: protectedProcedure
    .input(calculatorInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const supplierId = await resolveVerifiedSupplierId(ctx.user.id);
      if (supplierId == null) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No supplier profile found" });
      }

      const result = calculateEmissions({
        electricityKwh:  input.electricityKwh,
        naturalGasMmbtu: input.naturalGasMmbtu,
        dieselGallons:   input.dieselGallons,
        annualRevenue:   input.annualRevenue,
      });

      const calcUpdateSet = {
        scope1Emissions:   result.scope1Emissions.toString(),
        scope2Emissions:   result.scope2Emissions.toString(),
        totalEmissions:    result.totalEmissions.toString(),
        dataQualityLevel:  result.dataQualityLevel as "L0" | "L1" | "L2" | "L3",
        calculationMethod: result.calculationMethod,
        dataSourceType:    (result.calculationMethod === "energy_bill" ? "energy_bill" : "spend_based") as string,
        lastUpdatedBy:     ctx.user.id,
        updatedAt:         new Date(),
        ...(input.electricityKwh  != null && { electricityKwh:  input.electricityKwh.toString() }),
        ...(input.naturalGasMmbtu != null && { naturalGasMmbtu: input.naturalGasMmbtu.toString() }),
        ...(input.dieselGallons   != null && { dieselGallons:   input.dieselGallons.toString() }),
        ...(input.annualRevenue   != null && { annualRevenue:   input.annualRevenue.toString() }),
      };

      // Upsert
      const [existing] = await db
        .select({ id: supplierSustainabilityProfiles.id })
        .from(supplierSustainabilityProfiles)
        .where(eq(supplierSustainabilityProfiles.supplierId, supplierId))
        .limit(1);

      if (existing) {
        await db
          .update(supplierSustainabilityProfiles)
          .set(calcUpdateSet)
          .where(eq(supplierSustainabilityProfiles.supplierId, supplierId));
      } else {
        await db
          .insert(supplierSustainabilityProfiles)
          .values({ supplierId, ...calcUpdateSet });
      }

      return {
        ok: true,
        ...result,
      };
    }),
});
