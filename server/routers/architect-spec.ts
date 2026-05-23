/**
 * Architect Spec Router
 *
 * Endpoints for uploading the architect's Embodied Carbon Tables PDF/Excel,
 * triggering parsing + matching, and reading the results.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { parseArchitectSpec } from "../services/architect-spec-parser";
import { matchSpecAlternatives } from "../services/architect-spec-matcher";
import { generateRfqPdf } from "../services/rfq-pdf-generator";
import { generateRfqExcel } from "../services/rfq-excel-generator";
import { generateRfqRevit } from "../services/rfq-revit-generator";
import { getDb } from "../db";
import {
  architectUploadedSpecs,
  architectSpecAssemblies,
} from "../../drizzle/schema-additions-mcs";
import { eq, desc } from "drizzle-orm";
import { storagePut } from "../storage";

export const architectSpecRouter = router({
  /** List all uploaded specs for the current architect. */
  listSpecs: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(architectUploadedSpecs)
      .where(eq(architectUploadedSpecs.architectId, ctx.user.id))
      .orderBy(desc(architectUploadedSpecs.createdAt));
  }),

  /** Get one parsed spec + every assembly row + match status. */
  getSpec: protectedProcedure
    .input(z.object({ specId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      const [spec] = await db
        .select()
        .from(architectUploadedSpecs)
        .where(eq(architectUploadedSpecs.id, input.specId));
      if (!spec) throw new Error("Spec not found");
      if (spec.architectId !== ctx.user.id) throw new Error("Forbidden");

      const assemblies = await db
        .select()
        .from(architectSpecAssemblies)
        .where(eq(architectSpecAssemblies.specId, input.specId));

      return { spec, assemblies };
    }),

  /** Upload a file to blob storage and return the public URL. */
  uploadFile: protectedProcedure
    .input(
      z.object({
        fileBufferBase64: z.string().min(1),
        originalFilename: z.string().min(1),
        mimeType: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const buffer = Buffer.from(input.fileBufferBase64, "base64");
      const path = `architect-specs/${ctx.user.id}/${Date.now()}-${input.originalFilename}`;
      const mimeType = input.mimeType || "application/octet-stream";

      try {
        const { url } = await storagePut(path, buffer, mimeType);
        return { success: true, blobUrl: url };
      } catch (error) {
        console.error("File upload failed:", error);
        throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),

  /**
   * Upload + parse a spec PDF/XLSX. Caller passes a base64-encoded buffer
   * plus the public blob URL where the file already lives (frontend uploads
   * directly to blob storage, then calls this).
   */
  uploadAndParse: protectedProcedure
    .input(
      z.object({
        originalFilename: z.string().min(1),
        blobUrl: z.string().optional(), // optional for quick-lookup (no blob upload needed)
        mimeType: z.string().optional(),
        fileBufferBase64: z.string().min(1),
        projectName: z.string().optional(),
        projectLocation: z.string().optional(),
        estimatedValue: z.number().nonnegative().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const buffer = Buffer.from(input.fileBufferBase64, "base64");

      try {
        const result = await parseArchitectSpec({
          architectId: ctx.user.id,
          fileBuffer: buffer,
          originalFilename: input.originalFilename,
          blobUrl:
            input.blobUrl ??
            `inline://architect-specs/${ctx.user.id}/${Date.now()}-${input.originalFilename}`,
          mimeType: input.mimeType,
          projectName: input.projectName,
          projectLocation: input.projectLocation,
          estimatedValue: input.estimatedValue,
        });
        return result;
      } catch (err) {
        // Log the full error server-side for debugging, never expose DB internals to client
        console.error("[architect-spec] uploadAndParse failed:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "Failed to analyze assembly. Please try again.",
        });
      }
    }),

  /** Run the matcher across every parsed row in a spec. */
  matchAlternatives: protectedProcedure
    .input(
      z.object({
        specId: z.number().int().positive(),
        topN: z.number().int().min(1).max(20).default(5),
        persona: z
          .enum(["aor", "leed_ap", "gc_pm", "spec_writer", "interior_designer"])
          .default("aor"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      // Authorisation: caller must own the spec.
      const [spec] = await db
        .select({ architectId: architectUploadedSpecs.architectId })
        .from(architectUploadedSpecs)
        .where(eq(architectUploadedSpecs.id, input.specId));
      if (!spec) throw new Error("Spec not found");
      if (spec.architectId !== ctx.user.id) throw new Error("Forbidden");

      return matchSpecAlternatives(input.specId, {
        topN: input.topN,
        persona: input.persona,
      });
    }),

  /**
   * Generate RFQ in requested format (PDF, Excel, or Revit CSV).
   * Returns: { buffer (base64), filename, mimeType }
   * Frontend decodes and triggers download.
   */
  generateRfq: protectedProcedure
    .input(
      z.object({
        specId: z.number().int().positive(),
        specAssemblyId: z.number().int().positive(),
        selectedAlternativeId: z.number().int().positive(),
        format: z.enum(["pdf", "excel", "revit"]).default("pdf"),
        projectName: z.string().optional(),
        architectName: z.string().optional(),
        buildingAddress: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      // Authorization: caller must own the spec
      const [spec] = await db
        .select({ architectId: architectUploadedSpecs.architectId })
        .from(architectUploadedSpecs)
        .where(eq(architectUploadedSpecs.id, input.specId));
      if (!spec) throw new Error("Spec not found");
      if (spec.architectId !== ctx.user.id) throw new Error("Forbidden");

      // Verify assembly belongs to spec
      const [assembly] = await db
        .select()
        .from(architectSpecAssemblies)
        .where(eq(architectSpecAssemblies.id, input.specAssemblyId));
      if (!assembly || assembly.specId !== input.specId) {
        throw new Error("Assembly not found or does not belong to spec");
      }

      let buffer: Buffer;
      let filename: string;
      let mimeType: string;

      if (input.format === "pdf") {
        const result = await generateRfqPdf({
          specId: input.specId,
          specAssemblyId: input.specAssemblyId,
          selectedAlternativeId: input.selectedAlternativeId,
          projectName: input.projectName,
          architectName: input.architectName,
          buildingAddress: input.buildingAddress,
        });
        buffer = result.buffer;
        filename = result.filename;
        mimeType = "application/pdf";
      } else if (input.format === "excel") {
        const result = await generateRfqExcel({
          specId: input.specId,
          specAssemblyId: input.specAssemblyId,
          selectedAlternativeId: input.selectedAlternativeId,
          projectName: input.projectName,
          architectName: input.architectName,
          buildingAddress: input.buildingAddress,
        });
        buffer = result.buffer;
        filename = result.filename;
        mimeType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      } else if (input.format === "revit") {
        const result = await generateRfqRevit({
          specId: input.specId,
          specAssemblyId: input.specAssemblyId,
          selectedAlternativeId: input.selectedAlternativeId,
        });
        buffer = result.buffer;
        filename = result.filename;
        mimeType = "text/csv";
      } else {
        throw new Error(`Unsupported format: ${input.format}`);
      }

      // Return as base64 for transmission over JSON
      return {
        buffer: buffer.toString("base64"),
        filename,
        mimeType,
      };
    }),
});
