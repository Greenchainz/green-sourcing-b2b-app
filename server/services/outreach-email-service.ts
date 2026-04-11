/**
 * GreenChainz Outreach Email Service
 *
 * Manages the "Claim Your Profile" supplier outreach sequence via Resend.
 * Three-step drip:
 *   Step 1 (Day 0):  "Architects are searching for [category] on GreenChainz"
 *   Step 2 (Day 4):  "Your profile has had X views this week"
 *   Step 3 (Day 10): "Last chance — claim before a competitor does"
 *
 * Uses Resend (RESEND_API_KEY already in env).
 * All sends logged to crm_email_sequences + crm_events.
 */

import { Resend } from "resend";
import { getDb } from "../db";
import {
  crmContacts,
  crmEvents,
  crmEmailSequences,
} from "../../drizzle/schema";
import { eq, and, isNull, lte } from "drizzle-orm";

const FROM = "noreply@updates.greenchainz.com";
const REPLY_TO = "hello@greenchainz.com";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://greenchainz.com";

// ─── Email Templates ──────────────────────────────────────────────────────────

function step1Html(contact: { companyName: string; category: string; keyProduct?: string | null }): string {
  return `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
  <img src="${BASE_URL}/brand/greenchainz-logo.png" alt="GreenChainz" style="height:32px;margin-bottom:24px" />
  <h2 style="font-size:20px;font-weight:700;margin-bottom:8px">
    Specification writers are searching for ${contact.category} on GreenChainz
  </h2>
  <p style="color:#555;line-height:1.6">
    Hi,
  </p>
  <p style="color:#555;line-height:1.6">
    We've built a profile for <strong>${contact.companyName}</strong> on GreenChainz — the platform used by
    LEED Accredited Professionals and specification writers sourcing verified sustainable building materials.
  </p>
  ${contact.keyProduct ? `<p style="color:#555;line-height:1.6">Your product <strong>${contact.keyProduct}</strong> is listed in our material catalog, complete with sustainability data pulled from public sources.</p>` : ""}
  <p style="color:#555;line-height:1.6">
    Claiming your profile lets you:
  </p>
  <ul style="color:#555;line-height:1.8;padding-left:20px">
    <li>Manage your product data and keep specs current</li>
    <li>See which architects and spec writers are viewing your products</li>
    <li>Receive RFQ leads directly to your inbox</li>
    <li>Get featured in our Carbon Compare assembly tool</li>
  </ul>
  <a href="${BASE_URL}/suppliers/claim?company=${encodeURIComponent(contact.companyName)}&utm_source=outreach&utm_medium=email&utm_campaign=claim_profile&utm_content=step1"
     style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;margin:16px 0">
    Claim Your Free Profile →
  </a>
  <p style="color:#999;font-size:12px;margin-top:32px">
    GreenChainz · <a href="${BASE_URL}/unsubscribe?email={{email}}" style="color:#999">Unsubscribe</a>
  </p>
</div>`.trim();
}

function step2Html(contact: { companyName: string; category: string }): string {
  return `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
  <img src="${BASE_URL}/brand/greenchainz-logo.png" alt="GreenChainz" style="height:32px;margin-bottom:24px" />
  <h2 style="font-size:20px;font-weight:700;margin-bottom:8px">
    Your ${contact.companyName} profile is getting attention
  </h2>
  <p style="color:#555;line-height:1.6">
    Architects and spec writers have been viewing your profile on GreenChainz this week.
    They're actively sourcing ${contact.category} alternatives with verified EPD data.
  </p>
  <p style="color:#555;line-height:1.6">
    Unclaimed profiles can't receive RFQ notifications — you may be missing quote requests right now.
  </p>
  <a href="${BASE_URL}/suppliers/claim?company=${encodeURIComponent(contact.companyName)}&utm_source=outreach&utm_medium=email&utm_campaign=claim_profile&utm_content=step2"
     style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;margin:16px 0">
    Claim Your Profile & Enable RFQ Alerts →
  </a>
  <p style="color:#999;font-size:12px;margin-top:32px">
    GreenChainz · <a href="${BASE_URL}/unsubscribe?email={{email}}" style="color:#999">Unsubscribe</a>
  </p>
</div>`.trim();
}

function step3Html(contact: { companyName: string; category: string }): string {
  return `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
  <img src="${BASE_URL}/brand/greenchainz-logo.png" alt="GreenChainz" style="height:32px;margin-bottom:24px" />
  <h2 style="font-size:20px;font-weight:700;margin-bottom:8px">
    A quick note on your GreenChainz profile
  </h2>
  <p style="color:#555;line-height:1.6">
    We reached out a couple of times about your unclaimed ${contact.companyName} profile.
    We know inboxes are noisy — this is our last note on this.
  </p>
  <p style="color:#555;line-height:1.6">
    If you'd like to control how your products appear to the specification writers, LEED consultants,
    and procurement officers sourcing ${contact.category} on our platform, the profile is yours to claim anytime.
  </p>
  <a href="${BASE_URL}/suppliers/claim?company=${encodeURIComponent(contact.companyName)}&utm_source=outreach&utm_medium=email&utm_campaign=claim_profile&utm_content=step3"
     style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;margin:16px 0">
    Claim Profile (Free)
  </a>
  <p style="color:#999;font-size:12px;margin-top:32px">
    GreenChainz · <a href="${BASE_URL}/unsubscribe?email={{email}}" style="color:#999">Unsubscribe</a>
  </p>
</div>`.trim();
}

const SEQUENCE_STEPS = [
  { step: 1, subjectFn: (c: any) => `Architects are sourcing ${c.category} on GreenChainz`, htmlFn: step1Html, delayDays: 0 },
  { step: 2, subjectFn: (c: any) => `Your ${c.companyName} profile is getting views`, htmlFn: step2Html, delayDays: 4 },
  { step: 3, subjectFn: (c: any) => `One last note — ${c.companyName} on GreenChainz`, htmlFn: step3Html, delayDays: 10 },
];

// ─── Enroll a contact in the claim-profile sequence ───────────────────────────

export async function enrollInClaimSequence(contactId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = new Date();

  for (const step of SEQUENCE_STEPS) {
    const scheduledAt = new Date(now);
    scheduledAt.setDate(scheduledAt.getDate() + step.delayDays);

    // Idempotent: don't double-enroll
    const existing = await db
      .select({ id: crmEmailSequences.id })
      .from(crmEmailSequences)
      .where(
        and(
          eq(crmEmailSequences.contactId, contactId),
          eq(crmEmailSequences.sequenceName, "claim_profile"),
          eq(crmEmailSequences.step, step.step)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(crmEmailSequences).values({
        contactId,
        sequenceName: "claim_profile",
        step: step.step,
        scheduledAt,
        status: "pending",
      });
    }
  }
}

// ─── Drip processor — called daily by scheduler ───────────────────────────────

export async function processDueSequenceSteps(): Promise<{ sent: number; errors: number }> {
  // Also run buyer role drip alongside the supplier claim sequence
  try {
    const { processBuyerRoleDrip } = await import("./buyer-drip-sequences");
    await processBuyerRoleDrip();
  } catch (e) {
    console.error("[Outreach] Buyer drip failed:", e);
  }

  const db = await getDb();
  if (!db) return { sent: 0, errors: 0 };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[Outreach] RESEND_API_KEY not set — skipping drip");
    return { sent: 0, errors: 0 };
  }

  const resend = new Resend(apiKey);
  const now = new Date();

  // Find all pending steps that are due and have an email address
  const due = await db
    .select({
      seq: crmEmailSequences,
      contact: crmContacts,
    })
    .from(crmEmailSequences)
    .innerJoin(crmContacts, eq(crmEmailSequences.contactId, crmContacts.id))
    .where(
      and(
        eq(crmEmailSequences.status, "pending"),
        lte(crmEmailSequences.scheduledAt, now)
      )
    )
    .limit(50); // max 50 sends per daily run

  let sent = 0;
  let errors = 0;

  for (const { seq, contact } of due) {
    // Skip if no email, unsubscribed, or contact is dead/churned
    if (!contact.email || contact.stage === "dead" || contact.stage === "churned") {
      await db
        .update(crmEmailSequences)
        .set({ status: "skipped" })
        .where(eq(crmEmailSequences.id, seq.id));
      continue;
    }

    // Skip if already unsubscribed
    if (seq.unsubscribedAt) {
      await db
        .update(crmEmailSequences)
        .set({ status: "skipped" })
        .where(eq(crmEmailSequences.id, seq.id));
      continue;
    }

    const stepConfig = SEQUENCE_STEPS.find((s) => s.step === seq.step);
    if (!stepConfig) continue;

    try {
      const subject = stepConfig.subjectFn(contact);
      const html = stepConfig.htmlFn(contact as any);

      const { data, error } = await resend.emails.send({
        from: FROM,
        replyTo: REPLY_TO,
        to: contact.email,
        subject,
        html,
        tags: [
          { name: "sequence", value: "claim_profile" },
          { name: "step", value: String(seq.step) },
          { name: "contact_id", value: String(contact.id) },
        ],
      });

      if (error || !data) {
        throw new Error(error?.message ?? "Resend returned no data");
      }

      // Mark sent
      await db
        .update(crmEmailSequences)
        .set({
          status: "sent",
          sentAt: new Date(),
          resendMessageId: data.id,
        })
        .where(eq(crmEmailSequences.id, seq.id));

      // Log CRM event
      await db.insert(crmEvents).values({
        contactId: contact.id,
        eventType: "email_sent",
        subject,
        performedBy: "system",
        metadata: { sequenceName: seq.sequenceName, step: seq.step, resendId: data.id },
      });

      // Update lastContactedAt on contact
      await db
        .update(crmContacts)
        .set({ lastContactedAt: new Date(), updatedAt: new Date() })
        .where(eq(crmContacts.id, contact.id));

      sent++;
    } catch (err: any) {
      console.error(`[Outreach] Failed step ${seq.step} for contact ${contact.id}:`, err);
      await db
        .update(crmEmailSequences)
        .set({ status: "error" })
        .where(eq(crmEmailSequences.id, seq.id));
      errors++;
    }

    // 200ms pause between sends (Resend rate limit: 2 req/s on free)
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`[Outreach] Drip run done — ${sent} sent, ${errors} errors`);
  return { sent, errors };
}

// ─── Send a one-off manual email to a contact ─────────────────────────────────

export async function sendManualEmail(
  contactId: number,
  subject: string,
  html: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "DB unavailable" };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { success: false, error: "RESEND_API_KEY not set" };

  const [contact] = await db
    .select()
    .from(crmContacts)
    .where(eq(crmContacts.id, contactId))
    .limit(1);

  if (!contact?.email) return { success: false, error: "Contact has no email" };

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: contact.email,
    subject,
    html,
  });

  if (error || !data) {
    return { success: false, error: error?.message ?? "Unknown Resend error" };
  }

  await db.insert(crmEvents).values({
    contactId,
    eventType: "email_sent",
    subject,
    performedBy: "admin",
    metadata: { manual: true, resendId: data.id },
  });

  await db
    .update(crmContacts)
    .set({ lastContactedAt: new Date(), updatedAt: new Date() })
    .where(eq(crmContacts.id, contactId));

  return { success: true, messageId: data.id };
}
