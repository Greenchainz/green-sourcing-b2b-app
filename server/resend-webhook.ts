/**
 * Resend Webhook Handler
 *
 * Receives real-time email events from Resend and updates the database:
 *   - email.bounced     → mark email as invalid, suppress future sends
 *   - email.opened      → record engagement, update supplier outreach score
 *   - email.clicked     → record high-intent signal
 *   - email.complained  → spam report → permanent suppression
 *   - email.delivered   → confirm delivery status
 *
 * Setup:
 *   1. Resend dashboard → Webhooks → Add endpoint
 *   2. URL: https://greenchainz-frontend.jollyrock-a66f2da6.eastus.azurecontainerapps.io/api/webhooks/resend
 *   3. Select events: email.bounced, email.opened, email.clicked, email.complained, email.delivered
 *   4. Copy the Signing Secret → store as RESEND_WEBHOOK_SECRET in Azure Key Vault
 *
 * Signature verification uses svix (same library Resend uses internally).
 * If RESEND_WEBHOOK_SECRET is not set (local dev), verification is skipped.
 */

import { Router } from "express";
import { Webhook } from "svix";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

export const resendWebhookRouter = Router();

interface ResendEmailEvent {
  type:
    | "email.sent"
    | "email.delivered"
    | "email.delivery_delayed"
    | "email.complained"
    | "email.bounced"
    | "email.opened"
    | "email.clicked";
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject?: string;
    click?: { link: string };
    bounce?: { message: string };
  };
}

/**
 * POST /api/webhooks/resend
 * Receives signed event payloads from Resend.
 */
resendWebhookRouter.post("/api/webhooks/resend", async (req, res) => {
  // ── Signature verification ─────────────────────────────────────────────────
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret) {
    const wh = new Webhook(secret);
    try {
      wh.verify(JSON.stringify(req.body), {
        "svix-id": req.headers["svix-id"] as string,
        "svix-timestamp": req.headers["svix-timestamp"] as string,
        "svix-signature": req.headers["svix-signature"] as string,
      });
    } catch (err) {
      console.warn("[resend-webhook] Invalid signature — request rejected:", err);
      return res.status(401).json({ error: "Invalid webhook signature" });
    }
  } else {
    console.warn("[resend-webhook] RESEND_WEBHOOK_SECRET not set — skipping verification (dev mode)");
  }

  const payload = req.body as ResendEmailEvent;
  const email = (payload.data?.to?.[0] ?? "").toLowerCase().trim();

  if (!email) {
    return res.status(400).json({ error: "No recipient email in payload" });
  }

  console.log(`[resend-webhook] ${payload.type} → ${email}`);

  try {
    const db = await getDb();
    if (!db) {
      console.error("[resend-webhook] No DB connection");
      return res.status(500).json({ error: "DB unavailable" });
    }

    switch (payload.type) {
      case "email.bounced": {
        // Resend only fires email.bounced for hard bounces — safe to treat as permanent
        await db.execute(sql`
          INSERT INTO email_suppression_list (email, reason, suppressed_at, permanent)
          VALUES (${email}, ${payload.data.bounce?.message ?? "bounce"}, NOW(), true)
          ON CONFLICT (email) DO UPDATE SET
            reason      = EXCLUDED.reason,
            suppressed_at = NOW(),
            permanent   = true
        `);
        await db.execute(sql`
          UPDATE scraped_suppliers
          SET email_status = 'invalid', email_bounced_at = NOW()
          WHERE LOWER(email) = ${email}
        `);
        await db.execute(sql`
          UPDATE suppliers
          SET email_status = 'bounced'
          WHERE LOWER(email) = ${email}
        `);
        break;
      }

      case "email.opened": {
        await db.execute(sql`
          UPDATE scraped_suppliers
          SET email_opens        = COALESCE(email_opens, 0) + 1,
              last_engaged_at    = NOW(),
              email_status       = COALESCE(email_status, 'active')
          WHERE LOWER(email) = ${email}
        `);
        await db.execute(sql`
          UPDATE suppliers
          SET last_email_opened_at = NOW()
          WHERE LOWER(email) = ${email}
        `);
        break;
      }

      case "email.clicked": {
        await db.execute(sql`
          UPDATE scraped_suppliers
          SET email_clicks     = COALESCE(email_clicks, 0) + 1,
              last_engaged_at  = NOW(),
              email_status     = COALESCE(email_status, 'active')
          WHERE LOWER(email) = ${email}
        `);
        await db.execute(sql`
          INSERT INTO email_engagement_log (email, event_type, url, occurred_at)
          VALUES (${email}, 'click', ${payload.data.click?.link ?? null}, NOW())
          ON CONFLICT DO NOTHING
        `).catch(() => {
          // Table may not exist in all environments — non-fatal
        });
        break;
      }

      case "email.complained": {
        // Spam complaint — permanent suppression, same as unsubscribe
        await db.execute(sql`
          INSERT INTO email_suppression_list (email, reason, suppressed_at, permanent)
          VALUES (${email}, 'spam', NOW(), true)
          ON CONFLICT (email) DO UPDATE SET
            reason        = 'spam',
            suppressed_at = NOW(),
            permanent     = true
        `);
        await db.execute(sql`
          UPDATE scraped_suppliers
          SET email_status = 'unsubscribed'
          WHERE LOWER(email) = ${email}
        `);
        await db.execute(sql`
          UPDATE suppliers
          SET email_status = 'unsubscribed'
          WHERE LOWER(email) = ${email}
        `);
        break;
      }

      case "email.delivered": {
        await db.execute(sql`
          UPDATE scraped_suppliers
          SET email_status = COALESCE(NULLIF(email_status, 'unknown'), 'delivered')
          WHERE LOWER(email) = ${email}
        `);
        break;
      }

      default: {
        // email.sent, email.delivery_delayed — no DB action needed
        break;
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("[resend-webhook] Error processing event:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

/**
 * Check if an email address is suppressed before sending.
 * Call this before any outbound email to scraped/external suppliers.
 * Fail-open: returns false if DB is unavailable so sends are not blocked.
 */
export async function isEmailSuppressed(email: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    const result = await db.execute(sql`
      SELECT 1 FROM email_suppression_list
      WHERE LOWER(email) = ${email.toLowerCase().trim()}
      LIMIT 1
    `);
    return (result.rows?.length ?? 0) > 0;
  } catch {
    return false;
  }
}
