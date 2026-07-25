/**
 * RFx Invite Notifier
 *
 * Orchestrates the full auto-match + notify flow for Smart RFx sourcing requests.
 *
 * Called fire-and-forget from sourcing-request-router after `create`.
 * Never throws — all errors are logged, never propagated to the buyer.
 *
 * Flow:
 *   1. matchSuppliersForRfx  — score eligible verified suppliers
 *   2. Insert rfq_supplier_invites (ON CONFLICT DO NOTHING — idempotent)
 *   3. For each new invite:
 *        a. sendRfxInviteEmail   → email to supplier
 *        b. sendInAppNotification → DB row + WebPubSub broadcast
 *        c. deductLeadCredit      → suppliers.leadCredits -= 1
 *   4. Mark emailSent / inAppSent on the invite row
 */

import { getDb } from "../db";
import { suppliers, rfqSupplierInvites } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { matchSuppliersForRfx, type RfxMatchInput } from "./rfx-supplier-matcher";
import { sendRfxInviteEmail } from "../email-service";
import { sendInAppNotification } from "../notification-service";

// ─── Public API ───────────────────────────────────────────────────────────────

export interface RfxNotifyInput {
  rfqId:                  number;
  requestType:            string;
  projectName:            string;
  projectLocation?:       string;
  description?:           string;
  requiredCertifications?: string[];
}

export interface RfxNotifyResult {
  invited:    number;
  emailed:    number;
  inApp:      number;
  skipped:    number;  // already invited (idempotent re-run)
}

/**
 * Run the full auto-match + notify pipeline for a sourcing request.
 * Safe to call multiple times — duplicate invites are skipped via uniqueIndex.
 */
export async function notifyMatchedSuppliers(input: RfxNotifyInput): Promise<RfxNotifyResult> {
  const result: RfxNotifyResult = { invited: 0, emailed: 0, inApp: 0, skipped: 0 };

  try {
    const db = await getDb();
    if (!db) {
      console.warn("[rfx-notifier] No DB — skipping auto-match");
      return result;
    }

    // ── Step 1: Score candidates ─────────────────────────────────────────────
    const matchInput: RfxMatchInput = {
      requestType:            input.requestType,
      description:            input.description ?? "",
      projectLocation:        input.projectLocation,
      requiredCertifications: input.requiredCertifications,
    };

    const candidates = await matchSuppliersForRfx(matchInput);

    if (candidates.length === 0) {
      console.log(`[rfx-notifier] No eligible suppliers for rfq#${input.rfqId}`);
      return result;
    }

    console.log(`[rfx-notifier] rfq#${input.rfqId}: ${candidates.length} candidates`);

    // ── Step 2: Insert invite rows (skip existing) ────────────────────────────
    for (const candidate of candidates) {
      try {
        // Attempt insert — uniqueIndex on (rfqId, supplierId) prevents duplicates.
        // Drizzle doesn't expose onConflictDoNothing on all adapters, so we
        // catch the unique-constraint error and treat it as "already invited".
        await db.insert(rfqSupplierInvites).values({
          rfqId:      input.rfqId,
          supplierId: candidate.supplierId,
          matchScore: candidate.matchScore.toString(),
          emailSent:  false,
          inAppSent:  false,
        });
      } catch (err: unknown) {
        // Unique constraint violation → already invited, skip
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("unique") || msg.includes("duplicate") || msg.includes("idx_rsi_unique")) {
          result.skipped++;
          continue;
        }
        console.error(`[rfx-notifier] Insert invite failed for supplier#${candidate.supplierId}:`, err);
        continue;
      }

      result.invited++;

      // ── Step 3a: Send email ────────────────────────────────────────────────
      let emailOk = false;
      try {
        emailOk = await sendRfxInviteEmail({
          supplierEmail:   candidate.email,
          supplierName:    candidate.companyName,
          projectName:     input.projectName,
          projectLocation: input.projectLocation,
          requestType:     input.requestType,
          description:     input.description,
          matchScore:      Math.round(candidate.matchScore),
          rfqId:           input.rfqId,
        });
        if (emailOk) result.emailed++;
      } catch (err) {
        console.error(`[rfx-notifier] Email failed for supplier#${candidate.supplierId}:`, err);
      }

      // ── Step 3b: In-app notification ──────────────────────────────────────
      let inAppOk = false;
      try {
        const notifResult = await sendInAppNotification({
          userId:    candidate.userId,
          type:      "rfq_match",
          title:     `New project match: ${input.projectName}`,
          content:   `A buyer posted a ${input.requestType.replace(/_/g, " ")} that matches your profile${input.projectLocation ? ` in ${input.projectLocation}` : ""}. Match score: ${Math.round(candidate.matchScore)}%.`,
          relatedId: input.rfqId,
        });
        inAppOk = notifResult.success;
        if (inAppOk) result.inApp++;
      } catch (err) {
        console.error(`[rfx-notifier] In-app notification failed for user#${candidate.userId}:`, err);
      }

      // ── Step 3c: Mark sent flags on the invite row ─────────────────────────
      try {
        await db
          .update(rfqSupplierInvites)
          .set({
            emailSent:  emailOk,
            inAppSent:  inAppOk,
          })
          .where(
            and(
              eq(rfqSupplierInvites.rfqId,      input.rfqId),
              eq(rfqSupplierInvites.supplierId,  candidate.supplierId),
            )
          );
      } catch (err) {
        console.error(`[rfx-notifier] Update invite flags failed:`, err);
      }

      // ── Step 3d: Deduct one lead credit from the supplier ──────────────────
      try {
        await db
          .update(suppliers)
          .set({ leadCredits: sql`${suppliers.leadCredits} - 1` })
          .where(
            and(
              eq(suppliers.id,           candidate.supplierId),
              // Guard: never go below 0
              sql`${suppliers.leadCredits} > 0`,
            )
          );
      } catch (err) {
        console.error(`[rfx-notifier] Lead credit deduct failed for supplier#${candidate.supplierId}:`, err);
      }
    }

    console.log(
      `[rfx-notifier] rfq#${input.rfqId} done — invited:${result.invited} emailed:${result.emailed} inApp:${result.inApp} skipped:${result.skipped}`
    );
  } catch (err) {
    console.error("[rfx-notifier] Unexpected error:", err);
  }

  return result;
}
