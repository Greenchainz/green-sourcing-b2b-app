/**
 * Audit Log Service
 *
 * Immutable append-only record of security-relevant and business-critical
 * events. Use `auditLog.record()` for fire-and-forget logging anywhere in
 * the server. Failures are logged to console but never throw — audit log
 * writes must never break the main request path.
 *
 * Query access is restricted to admin users in the application layer.
 * Rows must never be updated or deleted.
 *
 * Usage:
 *   import { auditLog, AuditAction } from "./services/audit-log";
 *
 *   void auditLog.record({
 *     action: AuditAction.RFQ_CREATED,
 *     actorUserId: ctx.user.id,
 *     actorEmail: ctx.user.email ?? undefined,
 *     actorRole: ctx.user.role,
 *     resourceType: "rfq",
 *     resourceId: String(rfq.id),
 *     metadata: { materialType: input.materialType },
 *     req: ctx.req,
 *   });
 */

import type { Request } from "express";
import { getDb } from "../db";
import { auditLogs } from "../../drizzle/schema";

// ── Typed event catalogue ─────────────────────────────────────────────────────
// Add events here as you build new features. Prefer specificity over generic
// names — "RFQ_RESPONDED" is better than "RFQ_UPDATED".

export const AuditAction = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  AUTH_LOGIN_SUCCESS: "AUTH_LOGIN_SUCCESS",
  AUTH_LOGIN_FAILURE: "AUTH_LOGIN_FAILURE",
  AUTH_LOGOUT: "AUTH_LOGOUT",

  // ── Role & access ─────────────────────────────────────────────────────────
  ROLE_ASSIGNED: "ROLE_ASSIGNED",
  ROLE_CHANGED: "ROLE_CHANGED",
  CROSS_TENANT_ACCESS_BLOCKED: "CROSS_TENANT_ACCESS_BLOCKED",

  // ── Supplier ──────────────────────────────────────────────────────────────
  SUPPLIER_PROFILE_CREATED: "SUPPLIER_PROFILE_CREATED",
  SUPPLIER_PROFILE_UPDATED: "SUPPLIER_PROFILE_UPDATED",
  SUPPLIER_VERIFICATION_SUBMITTED: "SUPPLIER_VERIFICATION_SUBMITTED",
  SUPPLIER_VERIFICATION_APPROVED: "SUPPLIER_VERIFICATION_APPROVED",
  SUPPLIER_VERIFICATION_REJECTED: "SUPPLIER_VERIFICATION_REJECTED",

  // ── RFQ ───────────────────────────────────────────────────────────────────
  RFQ_CREATED: "RFQ_CREATED",
  RFQ_RESPONDED: "RFQ_RESPONDED",
  RFQ_CANCELLED: "RFQ_CANCELLED",
  RFQ_QUOTE_SUBMITTED: "RFQ_QUOTE_SUBMITTED",
  RFQ_QUOTE_ACCEPTED: "RFQ_QUOTE_ACCEPTED",

  // ── EPD / Certification ───────────────────────────────────────────────────
  EPD_SUBMITTED: "EPD_SUBMITTED",
  EPD_VERIFIED: "EPD_VERIFIED",
  CERTIFICATION_ADDED: "CERTIFICATION_ADDED",

  // ── Billing ───────────────────────────────────────────────────────────────
  BILLING_PLAN_CHANGED: "BILLING_PLAN_CHANGED",
  BILLING_SUBSCRIPTION_CANCELLED: "BILLING_SUBSCRIPTION_CANCELLED",

  // ── Admin ─────────────────────────────────────────────────────────────────
  ADMIN_USER_ROLE_CHANGED: "ADMIN_USER_ROLE_CHANGED",
  ADMIN_SUPPLIER_TIER_CHANGED: "ADMIN_SUPPLIER_TIER_CHANGED",
  ADMIN_TEST_SESSION_CREATED: "ADMIN_TEST_SESSION_CREATED",
  ADMIN_BULK_EMAIL_SENT: "ADMIN_BULK_EMAIL_SENT",
  ADMIN_DATA_EXPORT: "ADMIN_DATA_EXPORT",

  // ── Admin destructive data control (soft-delete / restore / hard-purge) ────
  ADMIN_USER_DELETED: "ADMIN_USER_DELETED",
  ADMIN_USER_RESTORED: "ADMIN_USER_RESTORED",
  ADMIN_USER_PURGED: "ADMIN_USER_PURGED",
  ADMIN_MANUFACTURER_UPDATED: "ADMIN_MANUFACTURER_UPDATED",
  ADMIN_MANUFACTURER_DELETED: "ADMIN_MANUFACTURER_DELETED",
  ADMIN_MANUFACTURER_RESTORED: "ADMIN_MANUFACTURER_RESTORED",
  ADMIN_MANUFACTURER_PURGED: "ADMIN_MANUFACTURER_PURGED",
  ADMIN_SUPPLIER_DELETED: "ADMIN_SUPPLIER_DELETED",
  ADMIN_SUPPLIER_RESTORED: "ADMIN_SUPPLIER_RESTORED",
  ADMIN_SUPPLIER_PURGED: "ADMIN_SUPPLIER_PURGED",
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

// ── Record payload ────────────────────────────────────────────────────────────

export interface AuditRecordOptions {
  action: AuditAction;
  /** null / undefined for scheduler or system-initiated actions */
  actorUserId?: number | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  resourceType?: string;
  resourceId?: string | number;
  metadata?: Record<string, unknown>;
  /** "success" (default) | "failure" | "blocked" */
  outcome?: "success" | "failure" | "blocked";
  /** Pass ctx.req to capture IP and user-agent automatically */
  req?: Pick<Request, "headers" | "ip" | "socket">;
}

// ── Service ───────────────────────────────────────────────────────────────────

function extractIp(req: AuditRecordOptions["req"]): string | undefined {
  if (!req) return undefined;
  const forwarded = req.headers["x-forwarded-for"];
  if (Array.isArray(forwarded)) return forwarded[0]?.split(",")[0]?.trim();
  if (typeof forwarded === "string") return forwarded.split(",")[0]?.trim();
  return (req.socket as { remoteAddress?: string })?.remoteAddress ?? undefined;
}

function extractUserAgent(req: AuditRecordOptions["req"]): string | undefined {
  if (!req) return undefined;
  const ua = req.headers["user-agent"];
  return typeof ua === "string" ? ua.slice(0, 512) : undefined;
}

async function record(opts: AuditRecordOptions): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return; // DB not available — degrade gracefully, never throw

    await db.insert(auditLogs).values({
      actorUserId: opts.actorUserId ?? null,
      actorEmail: opts.actorEmail ?? null,
      actorRole: opts.actorRole ?? null,
      action: opts.action,
      resourceType: opts.resourceType ?? null,
      resourceId: opts.resourceId != null ? String(opts.resourceId) : null,
      metadata: opts.metadata ?? null,
      outcome: opts.outcome ?? "success",
      ipAddress: extractIp(opts.req) ?? null,
      userAgent: extractUserAgent(opts.req) ?? null,
    });
  } catch (err) {
    // Audit log failures must never crash the main request.
    console.error("[audit-log] Failed to write audit record:", {
      action: opts.action,
      actorUserId: opts.actorUserId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export const auditLog = { record };
