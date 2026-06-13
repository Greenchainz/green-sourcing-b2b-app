import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { caDocumentMessages, caDocuments } from "../../drizzle/schema";

const caDocumentTypeSchema = z.enum(["rfi", "change_request"]);
const caDocumentStatusSchema = z.enum([
  "draft",
  "open",
  "answered",
  "pending_approval",
  "approved",
  "rejected",
  "closed",
]);
const ballInCourtSchema = z.enum(["buyer", "architect", "supplier"]);

async function getOwnedDocumentOrThrow(documentId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

  const [row] = await db
    .select()
    .from(caDocuments)
    .where(and(eq(caDocuments.id, documentId), eq(caDocuments.createdBy, userId)))
    .limit(1);

  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "CA document not found" });
  return { db, row };
}

export const caDocumentsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        type: caDocumentTypeSchema,
        documentNumber: z.string().min(1).max(100),
        title: z.string().min(1).max(255),
        description: z.string().max(5000).optional(),
        projectId: z.number().int().positive().optional(),
        submittalId: z.number().int().positive().optional(),
        relatedRfqId: z.number().int().positive().optional(),
        relatedSwapValidationId: z.number().int().positive().optional(),
        question: z.string().max(8000).optional(),
        proposedResolution: z.string().max(8000).optional(),
        costImpact: z.number().min(-100000000).max(100000000).optional(),
        scheduleImpactDays: z.number().int().min(-3650).max(3650).optional(),
        dueAt: z.date().optional(),
        status: caDocumentStatusSchema.default("draft"),
        ballInCourt: ballInCourtSchema.default("buyer"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [created] = await db
        .insert(caDocuments)
        .values({
          type: input.type,
          status: input.status,
          ballInCourt: input.ballInCourt,
          documentNumber: input.documentNumber,
          title: input.title,
          description: input.description,
          projectId: input.projectId,
          submittalId: input.submittalId,
          relatedRfqId: input.relatedRfqId,
          relatedSwapValidationId: input.relatedSwapValidationId,
          question: input.question,
          proposedResolution: input.proposedResolution,
          costImpact: input.costImpact == null ? undefined : String(input.costImpact),
          scheduleImpactDays: input.scheduleImpactDays,
          dueAt: input.dueAt,
          createdBy: ctx.user.id,
        })
        .returning({ id: caDocuments.id });

      return { documentId: created.id };
    }),

  listMine: protectedProcedure
    .input(
      z.object({
        type: caDocumentTypeSchema.optional(),
        status: caDocumentStatusSchema.optional(),
        limit: z.number().int().min(1).max(200).default(100),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const filters = [eq(caDocuments.createdBy, ctx.user.id)];
      if (input.type) filters.push(eq(caDocuments.type, input.type));
      if (input.status) filters.push(eq(caDocuments.status, input.status));

      return db
        .select()
        .from(caDocuments)
        .where(and(...filters))
        .orderBy(desc(caDocuments.createdAt))
        .limit(input.limit);
    }),

  getById: protectedProcedure
    .input(z.object({ documentId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const { db, row } = await getOwnedDocumentOrThrow(input.documentId, ctx.user.id);
      const messages = await db
        .select()
        .from(caDocumentMessages)
        .where(eq(caDocumentMessages.documentId, input.documentId))
        .orderBy(asc(caDocumentMessages.createdAt));
      return { document: row, messages };
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        documentId: z.number().int().positive(),
        status: caDocumentStatusSchema,
        ballInCourt: ballInCourtSchema.optional(),
        officialResponse: z.string().max(8000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = await getOwnedDocumentOrThrow(input.documentId, ctx.user.id);
      const now = new Date();
      await db
        .update(caDocuments)
        .set({
          status: input.status,
          ballInCourt: input.ballInCourt,
          officialResponse: input.officialResponse,
          responseAt: input.officialResponse ? now : undefined,
          approvedAt: input.status === "approved" ? now : undefined,
          closedAt: input.status === "closed" ? now : undefined,
          updatedAt: now,
        })
        .where(eq(caDocuments.id, input.documentId));

      return { success: true };
    }),

  addMessage: protectedProcedure
    .input(
      z.object({
        documentId: z.number().int().positive(),
        message: z.string().min(1).max(4000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = await getOwnedDocumentOrThrow(input.documentId, ctx.user.id);
      const [created] = await db
        .insert(caDocumentMessages)
        .values({
          documentId: input.documentId,
          authorUserId: ctx.user.id,
          message: input.message,
        })
        .returning({ id: caDocumentMessages.id, createdAt: caDocumentMessages.createdAt });

      await db
        .update(caDocuments)
        .set({ updatedAt: new Date() })
        .where(eq(caDocuments.id, input.documentId));

      return { messageId: created.id, createdAt: created.createdAt };
    }),
});

