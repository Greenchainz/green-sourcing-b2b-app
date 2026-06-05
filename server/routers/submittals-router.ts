import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { submittals, submittalItems } from "../../drizzle/schema";

const submittalStatusSchema = z.enum([
  "draft",
  "submitted",
  "approved_as_noted",
  "revise_and_resubmit",
  "rejected",
  "closed",
]);

const ballInCourtSchema = z.enum(["buyer", "architect", "supplier"]);

async function getOwnedSubmittalOrThrow(submittalId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

  const [row] = await db
    .select()
    .from(submittals)
    .where(and(eq(submittals.id, submittalId), eq(submittals.createdBy, userId)))
    .limit(1);

  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Submittal not found" });
  return { db, row };
}

export const submittalsRouter = router({
  create: protectedProcedure
    .input(z.object({
      projectId: z.number().int().positive().optional(),
      specSection: z.string().max(50).optional(),
      masterformatCode: z.string().max(20).optional(),
      submittalNumber: z.string().min(1).max(100),
      title: z.string().min(1).max(255),
      description: z.string().max(5000).optional(),
      status: submittalStatusSchema.default("draft"),
      ballInCourt: ballInCourtSchema.default("buyer"),
      submittedAt: z.date().optional(),
      dueAt: z.date().optional(),
      requiredOnSiteAt: z.date().optional(),
      returnedAt: z.date().optional(),
      relatedRfqId: z.number().int().positive().optional(),
      relatedSwapValidationId: z.number().int().positive().optional(),
      items: z.array(z.object({
        materialId: z.number().int().positive().optional(),
        supplierId: z.number().int().positive().optional(),
        notes: z.string().max(1000).optional(),
      })).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [created] = await db
        .insert(submittals)
        .values({
          projectId: input.projectId,
          specSection: input.specSection,
          masterformatCode: input.masterformatCode,
          submittalNumber: input.submittalNumber,
          title: input.title,
          description: input.description,
          status: input.status,
          ballInCourt: input.ballInCourt,
          submittedAt: input.submittedAt,
          dueAt: input.dueAt,
          requiredOnSiteAt: input.requiredOnSiteAt,
          returnedAt: input.returnedAt,
          relatedRfqId: input.relatedRfqId,
          relatedSwapValidationId: input.relatedSwapValidationId,
          createdBy: ctx.user.id,
        })
        .returning({ id: submittals.id });

      if (input.items.length > 0) {
        await db.insert(submittalItems).values(
          input.items.map((item) => ({
            submittalId: created.id,
            materialId: item.materialId,
            supplierId: item.supplierId,
            notes: item.notes,
          })),
        );
      }

      return { submittalId: created.id };
    }),

  listMine: protectedProcedure
    .input(z.object({
      status: submittalStatusSchema.optional(),
      limit: z.number().int().min(1).max(200).default(100),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const filters = [eq(submittals.createdBy, ctx.user.id)];
      if (input.status) filters.push(eq(submittals.status, input.status));

      return db
        .select()
        .from(submittals)
        .where(and(...filters))
        .orderBy(desc(submittals.createdAt))
        .limit(input.limit);
    }),

  getById: protectedProcedure
    .input(z.object({ submittalId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const { db, row } = await getOwnedSubmittalOrThrow(input.submittalId, ctx.user.id);
      const items = await db
        .select()
        .from(submittalItems)
        .where(eq(submittalItems.submittalId, input.submittalId))
        .orderBy(desc(submittalItems.id));
      return { submittal: row, items };
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      submittalId: z.number().int().positive(),
      status: submittalStatusSchema,
      ballInCourt: ballInCourtSchema.optional(),
      returnedAt: z.date().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db } = await getOwnedSubmittalOrThrow(input.submittalId, ctx.user.id);

      await db
        .update(submittals)
        .set({
          status: input.status,
          ballInCourt: input.ballInCourt,
          returnedAt: input.returnedAt === undefined ? undefined : input.returnedAt,
          updatedAt: new Date(),
        })
        .where(eq(submittals.id, input.submittalId));

      return { success: true };
    }),

  attachReferences: protectedProcedure
    .input(z.object({
      submittalId: z.number().int().positive(),
      relatedRfqId: z.number().int().positive().optional(),
      relatedSwapValidationId: z.number().int().positive().optional(),
      materialIds: z.array(z.number().int().positive()).optional(),
      supplierIds: z.array(z.number().int().positive()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db } = await getOwnedSubmittalOrThrow(input.submittalId, ctx.user.id);

      await db
        .update(submittals)
        .set({
          relatedRfqId: input.relatedRfqId,
          relatedSwapValidationId: input.relatedSwapValidationId,
          updatedAt: new Date(),
        })
        .where(eq(submittals.id, input.submittalId));

      const materialIds = [...new Set(input.materialIds ?? [])];
      const supplierIds = [...new Set(input.supplierIds ?? [])];
      if (materialIds.length > 0 || supplierIds.length > 0) {
        const values = [
          ...materialIds.map((materialId) => ({ submittalId: input.submittalId, materialId, supplierId: null as number | null })),
          ...supplierIds.map((supplierId) => ({ submittalId: input.submittalId, materialId: null as number | null, supplierId })),
        ];
        await db.insert(submittalItems).values(values);
      }

      const items = await db
        .select()
        .from(submittalItems)
        .where(eq(submittalItems.submittalId, input.submittalId));

      return { success: true, itemCount: items.length };
    }),

  listByReference: protectedProcedure
    .input(z.object({
      rfqId: z.number().int().positive().optional(),
      swapValidationId: z.number().int().positive().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const filters = [eq(submittals.createdBy, ctx.user.id)];
      if (input.rfqId) filters.push(eq(submittals.relatedRfqId, input.rfqId));
      if (input.swapValidationId) filters.push(eq(submittals.relatedSwapValidationId, input.swapValidationId));
      return db
        .select()
        .from(submittals)
        .where(and(...filters))
        .orderBy(desc(submittals.createdAt));
    }),
});
