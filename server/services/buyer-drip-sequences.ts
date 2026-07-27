/**
 * Buyer Role Drip Sequences
 *
 * Processes the "buyer_role_drip" CRM email sequence.
 * Each contact gets 3 emails at 0 / 4 / 10 days after scraping,
 * with copy generated from their specific role config.
 *
 * Called daily by processDueSequenceSteps() in outreach-email-service.ts
 */

import { Resend } from "resend";
import { getDb } from "../db";
import {
  crmContacts,
  crmEmailSequences,
  crmEvents,
} from "../../drizzle/schema";
import { eq, and, lte, inArray } from "drizzle-orm";
import { ROLE_BY_CATEGORY } from "../../lib/scrapers/lead-role-config";

const FROM = "noreply@updates.greenchainz.com";
const REPLY_TO = "hello@greenchainz.com";
const BASE_URL = process.env.FRONTEND_URL ?? "https://greenchainz.com";

// ── HTML wrapper ──────────────────────────────────────────────────────────────

function wrapEmail(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
         line-height:1.6;color:#1a1a1a;margin:0;padding:0;background:#f5f5f5}
    .w{max-width:600px;margin:0 auto;background:#fff}
    .hdr{background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:28px 36px}
    .hdr h1{color:#fff;margin:0;font-size:20px;font-weight:700}
    .hdr p{color:rgba(255,255,255,.8);margin:4px 0 0;font-size:13px}
    .body{padding:32px 36px}
    .hl{font-size:21px;font-weight:700;color:#065f46;margin:0 0 14px;line-height:1.3}
    .box{background:#f0fdf4;border:1px solid #bbf7d0;border-left:4px solid #10b981;
         border-radius:8px;padding:18px 22px;margin:22px 0}
    .box ul{margin:0;padding-left:18px}
    .box li{margin:5px 0;font-size:14px;color:#374151}
    .cta{display:inline-block;background:#10b981;color:#fff;text-decoration:none;
         padding:13px 32px;border-radius:6px;font-weight:700;font-size:15px;margin:10px 0}
    .ft{padding:20px 36px;border-top:1px solid #e5e7eb;text-align:center}
    .ft p{color:#9ca3af;font-size:12px;margin:3px 0}
    .ft a{color:#9ca3af}
  </style>
</head>
<body><div class="w">${content}</div></body>
</html>`.trim();
}

function renderStep(
  step: 1 | 2 | 3,
  company: string,
  crmCategory: string,
  email: string
): { subject: string; html: string } | null {
  const role = ROLE_BY_CATEGORY.get(crmCategory);
  if (!role) return null;

  const cfg = role.steps[step - 1];
  const subject = cfg.subject.replace(/\{\{company\}\}/g, company);
  const utmRole = encodeURIComponent(crmCategory);
  const ctaUrl = `${BASE_URL}/get-started?utm_source=buyer_drip&utm_medium=email&utm_campaign=${utmRole}&utm_content=step${step}`;
  const unsubUrl = `${BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}`;

  const bulletsHtml = cfg.bullets.length
    ? `<div class="box"><ul>${cfg.bullets.map(b => `<li>${b}</li>`).join("")}</ul></div>`
    : "";

  const html = wrapEmail(`
    <div class="hdr">
      <h1>🌱 GreenChainz</h1>
      <p>Sustainable Building Materials Procurement</p>
    </div>
    <div class="body">
      <p class="hl">${cfg.headline}</p>
      <p>${cfg.body}</p>
      ${bulletsHtml}
      <p><a href="${ctaUrl}" class="cta">${cfg.cta} →</a></p>
      <p style="font-size:13px;color:#6b7280;margin-top:24px">
        Free to start. No credit card. Works inside Revit, Excel, and your browser.
      </p>
    </div>
    <div class="ft">
      <p>© ${new Date().getFullYear()} GreenChainz Inc.</p>
      <p><a href="${unsubUrl}">Unsubscribe</a> · <a href="${BASE_URL}">greenchainz.com</a></p>
    </div>`);

  return { subject, html };
}

// ── Drip processor ────────────────────────────────────────────────────────────

export async function processBuyerRoleDrip(): Promise<{
  sent: number;
  errors: number;
  skipped: number;
}> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[buyer-drip] RESEND_API_KEY not set — skipping");
    return { sent: 0, errors: 0, skipped: 0 };
  }

  if (process.env.LEAD_OUTREACH_ENABLED !== "true") {
    console.log(
      "[buyer-drip] Disabled — set LEAD_OUTREACH_ENABLED=true to enable"
    );
    return { sent: 0, errors: 0, skipped: 0 };
  }

  const db = await getDb();
  if (!db) return { sent: 0, errors: 0, skipped: 0 };

  const resend = new Resend(apiKey);
  const now = new Date();

  // Pull all pending buyer_role_drip steps that are due
  const due = await db
    .select({ seq: crmEmailSequences, contact: crmContacts })
    .from(crmEmailSequences)
    .innerJoin(crmContacts, eq(crmEmailSequences.contactId, crmContacts.id))
    .where(
      and(
        eq(crmEmailSequences.sequenceName, "buyer_role_drip"),
        eq(crmEmailSequences.status, "pending"),
        lte(crmEmailSequences.scheduledAt, now)
      )
    )
    .limit(50); // max 50 per daily run

  let sent = 0;
  let errors = 0;
  let skipped = 0;

  const skippedSeqIds: number[] = [];
  const errorSeqIds: number[] = [];

  for (const { seq, contact } of due) {
    // Skip missing email, unsubscribed, dead stage
    if (
      !contact.email ||
      contact.stage === "dead" ||
      contact.stage === "churned" ||
      seq.unsubscribedAt
    ) {
      skippedSeqIds.push(seq.id);
      skipped++;
      continue;
    }

    const rendered = renderStep(
      seq.step as 1 | 2 | 3,
      contact.companyName,
      contact.category ?? "",
      contact.email
    );

    if (!rendered) {
      // Unknown role category — skip gracefully
      skippedSeqIds.push(seq.id);
      skipped++;
      continue;
    }

    try {
      const { data, error } = await resend.emails.send({
        from: FROM,
        replyTo: REPLY_TO,
        to: contact.email,
        subject: rendered.subject,
        html: rendered.html,
        tags: [
          { name: "sequence", value: "buyer_role_drip" },
          { name: "step", value: String(seq.step) },
          { name: "role", value: contact.category ?? "unknown" },
        ],
      });

      if (error || !data)
        throw new Error(error?.message ?? "Resend returned no data");

      await Promise.all([
        db
          .update(crmEmailSequences)
          .set({ status: "sent", sentAt: new Date(), resendMessageId: data.id })
          .where(eq(crmEmailSequences.id, seq.id)),

        db.insert(crmEvents).values({
          contactId: contact.id,
          eventType: "email_sent",
          subject: rendered.subject,
          performedBy: "system",
          metadata: {
            sequenceName: "buyer_role_drip",
            step: seq.step,
            role: contact.category,
            resendId: data.id,
          },
        }),

        db
          .update(crmContacts)
          .set({
            lastContactedAt: new Date(),
            updatedAt: new Date(),
            stage: "contacted",
          })
          .where(eq(crmContacts.id, contact.id)),
      ]);

      sent++;
      console.log(
        `[buyer-drip] ✅ Step ${seq.step} → ${contact.email} (${contact.category})`
      );
    } catch (err: any) {
      console.error(
        `[buyer-drip] ❌ Step ${seq.step} for ${contact.email}:`,
        err?.message
      );
      errorSeqIds.push(seq.id);
      errors++;
    }

    await new Promise(r => setTimeout(r, 200));
  }

  if (skippedSeqIds.length > 0) {
    await db
      .update(crmEmailSequences)
      .set({ status: "skipped" })
      .where(inArray(crmEmailSequences.id, skippedSeqIds));
  }

  if (errorSeqIds.length > 0) {
    await db
      .update(crmEmailSequences)
      .set({ status: "error" })
      .where(inArray(crmEmailSequences.id, errorSeqIds));
  }

  console.log(
    `[buyer-drip] Done — sent=${sent} skipped=${skipped} errors=${errors}`
  );
  return { sent, errors, skipped };
}
