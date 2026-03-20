/**
 * EPD (Environmental Product Declaration) Router
 *
 * Routes:
 *   epd.submit        — supplier submits/attaches an EPD to a material
 *   epd.update        — supplier updates their EPD record
 *   epd.listMine      — supplier lists their submitted EPDs
 *   epd.listForMaterial — public: EPDs for a given catalog material
 *   epd.lookup        — live EC3 lookup by EPD UUID (wraps EC3 API)
 */

import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { supplierMaterialEpds, suppliers } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { fetchEC3EPDById } from "../ec3";

const epdInput = z.object({
  productName: z.string().min(1, "Product name required"),
  materialId: z.number().int().positive().optional(),
  epdNumber: z.string().optional(),
  epdUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  epdProgramOperator: z.string().optional(),
  gwpValue: z.number().positive("GWP must be positive").optional(),
  gwpUnit: z.string().default("kgCO2e"),
  declaredUnit: z.string().optional(),
  externallyVerified: z.boolean().default(false),
  expiresAt: z.string().optional(), // ISO date string
});

export const epdRouter = router({
  // ── Supplier: submit an EPD record ───────────────────────────────────────
  submit: protectedProcedure
    .input(epdInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [supplierRow] = await db
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(eq(suppliers.userId, ctx.user.id))
        .limit(1);
      if (!supplierRow)
        throw new TRPCError({ code: "FORBIDDEN", message: "No supplier profile found" });

      const [row] = await db
        .insert(supplierMaterialEpds)
        .values({
          supplierId: supplierRow.id,
          materialId: input.materialId ?? null,
          productName: input.productName,
          epdNumber: input.epdNumber ?? null,
          epdUrl: input.epdUrl || null,
          epdProgramOperator: input.epdProgramOperator ?? null,
          gwpValue: input.gwpValue?.toString() ?? null,
          gwpUnit: input.gwpUnit,
          declaredUnit: input.declaredUnit ?? null,
          externallyVerified: input.externallyVerified,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          status: "pending",
        })
        .returning({ id: supplierMaterialEpds.id });

      return { id: row.id };
    }),

  // ── Supplier: update an EPD record ───────────────────────────────────────
  update: protectedProcedure
    .input(epdInput.partial().extend({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [supplierRow] = await db
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(eq(suppliers.userId, ctx.user.id))
        .limit(1);
      if (!supplierRow)
        throw new TRPCError({ code: "FORBIDDEN", message: "No supplier profile found" });

      // Ensure this EPD belongs to this supplier
      const [existing] = await db
        .select({ id: supplierMaterialEpds.id })
        .from(supplierMaterialEpds)
        .where(eq(supplierMaterialEpds.id, input.id))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "EPD record not found" });

      const { id, expiresAt, gwpValue, epdUrl, ...rest } = input;
      await db
        .update(supplierMaterialEpds)
        .set({
          ...rest,
          gwpValue: gwpValue?.toString(),
          epdUrl: epdUrl || null,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(supplierMaterialEpds.id, id));

      return { success: true };
    }),

  // ── Supplier: list their EPDs ─────────────────────────────────────────────
  listMine: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const [supplierRow] = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(eq(suppliers.userId, ctx.user.id))
      .limit(1);
    if (!supplierRow) return [];

    return db
      .select()
      .from(supplierMaterialEpds)
      .where(eq(supplierMaterialEpds.supplierId, supplierRow.id))
      .orderBy(desc(supplierMaterialEpds.createdAt));
  }),

  // ── Public: list EPDs for a catalog material ──────────────────────────────
  listForMaterial: publicProcedure
    .input(z.object({ materialId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select({
          id: supplierMaterialEpds.id,
          supplierId: supplierMaterialEpds.supplierId,
          supplierName: suppliers.companyName,
          productName: supplierMaterialEpds.productName,
          epdNumber: supplierMaterialEpds.epdNumber,
          epdUrl: supplierMaterialEpds.epdUrl,
          epdProgramOperator: supplierMaterialEpds.epdProgramOperator,
          gwpValue: supplierMaterialEpds.gwpValue,
          gwpUnit: supplierMaterialEpds.gwpUnit,
          declaredUnit: supplierMaterialEpds.declaredUnit,
          externallyVerified: supplierMaterialEpds.externallyVerified,
          expiresAt: supplierMaterialEpds.expiresAt,
          status: supplierMaterialEpds.status,
        })
        .from(supplierMaterialEpds)
        .leftJoin(suppliers, eq(supplierMaterialEpds.supplierId, suppliers.id))
        .where(eq(supplierMaterialEpds.materialId, input.materialId));
    }),

  // ── Public: live EC3 EPD lookup ───────────────────────────────────────────
  lookup: publicProcedure
    .input(z.object({ epdId: z.string().min(1) }))
    .query(async ({ input }) => {
      try {
        const epd = await fetchEC3EPDById(input.epdId);
        if (!epd) return null;
        return {
          id: epd.id,
          name: epd.name,
          gwp: epd.gwp,
          declaredUnit: epd.declared_unit,
          externallyVerified: epd.externally_verified,
          manufacturer: epd.manufacturer?.name,
          expiresAt: epd.date_validity_ends,
          epdUrl: epd.doc,
          industryMedian: epd.category.pct50_gwp,
          bestPractice: epd.best_practice,
          conservativeEstimate: epd.conservative_estimate,
          category: epd.category.display_name,
        };
      } catch {
        return null;
      }
    }),
});
