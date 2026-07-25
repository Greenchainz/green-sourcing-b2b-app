/**
 * EPD (Environmental Product Declaration) Router
 *
 * Routes:
 *   epd.submit            — supplier submits/attaches an EPD to a material
 *   epd.update            — supplier updates their EPD record
 *   epd.listMine          — supplier lists their submitted EPDs
 *   epd.listForMaterial   — public: EPDs for a given catalog material
 *   epd.lookup            — live EC3 lookup by EPD UUID (wraps EC3 API)
 *   epd.ingest            — ingest a JSON EPD record into epd_materials
 *   epd.listByAssembly    — list epd_materials rows filtered by assembly_type
 *   epd.listByAssemblies  — list epd_materials rows filtered by multiple assembly types
 *   epd.listBySupplier    — list epd_materials rows filtered by supplier_id
 *   epd.delete            — delete an epd_materials row (supplier-scoped)
 */

import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { supplierMaterialEpds, suppliers, epdMaterials } from "../../drizzle/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { fetchEC3EPDById } from "../ec3";
import { publishSupplierEvent } from "../services/event-bus";
import { normaliseEpdPayload } from "../services/epd-ingestion";

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

  // ── EPD Pipeline: ingest a JSON EPD record ────────────────────────────────
  ingest: protectedProcedure
    .input(
      z.object({
        manufacturerName: z.string().optional(),
        productName: z.string().min(1, "Product name is required"),
        epdNumber: z.string().optional(),
        gwpValue: z.number().nonnegative("GWP must be ≥ 0"),
        gwpUnit: z.enum(["per m2", "per kg", "per metric ton", "per 1000 sqft"]),
        declaredUnit: z.string().optional(),
        dimension: z.string().optional(),
        assemblyType: z.string().optional(),
        coreOption: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable().optional(),
        notes: z.string().optional(),
        massKgPer1000sf: z.number().positive().optional(),
        msfFactor: z.number().positive().optional(),
      })
    )
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

      let normalised;
      try {
        normalised = normaliseEpdPayload(input);
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "Normalisation failed",
        });
      }

      const [row] = await db
        .insert(epdMaterials)
        .values({
          supplierId: supplierRow.id,
          manufacturerName: normalised.manufacturerName ?? null,
          productName: normalised.productName,
          epdNumber: normalised.epdNumber ?? null,
          assemblyType: normalised.assemblyType ?? null,
          coreOption: normalised.coreOption ?? null,
          gwpRaw: normalised.gwpValue.toString(),
          gwpUnit: normalised.gwpUnit,
          gwpPer1000sf: normalised.gwpPer1000sf.toString(),
          declaredUnit: normalised.declaredUnit ?? null,
          dimensionParam: normalised.dimension ?? null,
          notes: normalised.notes ?? null,
        })
        .returning({ id: epdMaterials.id });

      void publishSupplierEvent({ type: "epd.ingested", epdId: row.id, supplierId: supplierRow.id })
        .catch((err) => console.error("[event-bus] epd.ingested", err));

      return { id: row.id, gwpPer1000sf: normalised.gwpPer1000sf };
    }),

  // ── EPD Pipeline: list by multiple assembly types ─────────────────────────
  listByAssemblies: publicProcedure
    .input(z.object({ assemblyTypes: z.array(z.string()).min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(epdMaterials)
        .where(inArray(epdMaterials.assemblyType, input.assemblyTypes))
        .orderBy(desc(epdMaterials.createdAt));
    }),

  // ── EPD Pipeline: list by assembly type ───────────────────────────────────
  listByAssembly: publicProcedure
    .input(z.object({ assemblyType: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(epdMaterials)
        .where(eq(epdMaterials.assemblyType, input.assemblyType))
        .orderBy(desc(epdMaterials.createdAt));
    }),

  // ── EPD Pipeline: list by supplier ────────────────────────────────────────
  listBySupplier: publicProcedure
    .input(z.object({ supplierId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(epdMaterials)
        .where(eq(epdMaterials.supplierId, input.supplierId))
        .orderBy(desc(epdMaterials.createdAt));
    }),

  // ── EPD Pipeline: delete (supplier-scoped) ────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
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

      const [existing] = await db
        .select({ id: epdMaterials.id, supplierId: epdMaterials.supplierId })
        .from(epdMaterials)
        .where(eq(epdMaterials.id, input.id))
        .limit(1);

      if (!existing)
        throw new TRPCError({ code: "NOT_FOUND", message: "EPD record not found" });
      if (existing.supplierId !== supplierRow.id)
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorised to delete this record" });

      await db.delete(epdMaterials).where(eq(epdMaterials.id, input.id));

      return { success: true };
    }),
});
