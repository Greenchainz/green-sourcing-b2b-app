/**
 * Audit Log Router — admin-only read access to the audit log.
 *
 * Writing to the audit log is done via auditLog.record() in services,
 * never through this router. This router is read-only.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { auditLogs } from "../../drizzle/schema";
import { desc, eq, and, gte, lte } from "drizzle-orm";
import { AuditAction } from "../services/audit-log";

export const auditRouter = router({
  /**
   * Paginated audit log — admin only.
   * Filter by action, actor, resource type, or date range.
   */
  list: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(200).default(50),
        actorUserId: z.number().int().optional(),
        action: z.nativeEnum(AuditAction).optional(),
        resourceType: z.string().optional(),
        resourceId: z.string().optional(),
        outcome: z.enum(["success", "failure", "blocked"]).optional(),
        fromDate: z.string().datetime().optional(),
        toDate: z.string().datetime().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [];
      if (input.actorUserId != null) conditions.push(eq(auditLogs.actorUserId, input.actorUserId));
      if (input.action) conditions.push(eq(auditLogs.action, input.action));
      if (input.resourceType) conditions.push(eq(auditLogs.resourceType, input.resourceType));
      if (input.resourceId) conditions.push(eq(auditLogs.resourceId, input.resourceId));
      if (input.outcome) conditions.push(eq(auditLogs.outcome, input.outcome));
      if (input.fromDate) conditions.push(gte(auditLogs.createdAt, new Date(input.fromDate)));
      if (input.toDate) conditions.push(lte(auditLogs.createdAt, new Date(input.toDate)));

      const offset = (input.page - 1) * input.limit;

      const rows = await db
        .select()
        .from(auditLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(auditLogs.createdAt))
        .limit(input.limit)
        .offset(offset);

      return { rows, page: input.page, limit: input.limit };
    }),

  /**
   * Single audit log entry by ID — admin only.
   */
  getById: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [row] = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.id, input.id))
        .limit(1);

      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Audit log entry not found" });

      return row;
    }),
});
