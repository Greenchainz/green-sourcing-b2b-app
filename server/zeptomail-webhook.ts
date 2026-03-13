/**
 * Zeptomail Webhook Handler
 *
 * Receives real-time email events from Zeptomail and updates the database:
 *   - bounce    → mark email as invalid, suppress future sends
 *   - open      → record engagement, update supplier outreach score
 *   - click     → record high-intent signal (supplier clicked RFQ link)
 *   - unsubscribe → mark email as opted-out, never send again
 *   - spam      → mark email as spam-reported, suppress immediately
 *
 * Zeptomail webhook setup:
 *   1. Zeptomail dashboard → Mail Agents → your agent → Webhooks
 *   2. Add URL: https://greenchainz-frontend.jollyrock-a66f2da6.eastus.azurecontainerapps.io/api/webhooks/zeptomail
 *   3. Select events: Bounce, Open, Click, Unsubscribe, Spam
 *   4. Save — no secret key required (Zeptomail uses IP allowlisting)
 *
 * Zeptomail webhook IP ranges (allowlist if needed):
 *   https://www.zeptomail.com/help/webhook-ip-allowlist
 */

import { Router } from "express";
import { getDb } from "../lib/db";
import { sql } from "drizzle-orm";

export const zeptomailWebhookRouter = Router();

interface ZeptomailEvent {
  event: "bounce" | "open" | "click" | "unsubscribe" | "spam" | "delivered";
  email: string;
  timestamp?: number;
  // Bounce-specific
  bounce_type?: "hard" | "soft";
  bounce_reason?: string;
  // Click-specific
  url?: string;
  // Message metadata (if available)
  subject?: string;
  message_id?: string;
}

/**
 * POST /api/webhooks/zeptomail
 * Receives event payloads from Zeptomail
 */
zeptomailWebhookRouter.post("/api/webhooks/zeptomail", async (req, res) => {
  try {
    // Zeptomail sends either a single event object or an array
    const events: ZeptomailEvent[] = Array.isArray(req.body)
      ? req.body
      : [req.body];

    console.log(`[zeptomail-webhook] Received ${events.length} event(s)`);

    const db = await getDb();
    if (!db) {
      console.error("[zeptomail-webhook] No DB connection");
      return res.status(500).json({ error: "DB unavailable" });
    }

    for (const event of events) {
      const email = (event.email || "").toLowerCase().trim();
      if (!email) continue;

      console.log(`[zeptomail-webhook] ${event.event} → ${email}`);

      switch (event.event) {
        case "bounce": {
          // Hard bounce = permanent invalid address → suppress all future sends
          // Soft bounce = temporary (full mailbox, server down) → log but don't suppress
          const suppress = event.bounce_type === "hard";
          await db.execute(sql`
            INSERT INTO email_suppression_list (email, reason, suppressed_at, permanent)
            VALUES (${email}, ${event.bounce_reason || event.bounce_type || "bounce"}, NOW(), ${suppress})
            ON CONFLICT (email) DO UPDATE SET
              reason = EXCLUDED.reason,
              suppressed_at = NOW(),
              permanent = EXCLUDED.permanent
          `);
          // Also mark the scraped_supplier email as invalid if it matches
          if (suppress) {
            await db.execute(sql`
              UPDATE scraped_suppliers
              SET email_status = 'invalid', email_bounced_at = NOW()
              WHERE LOWER(email) = ${email}
            `);
            // Mark registered supplier email as bounced too
            await db.execute(sql`
              UPDATE suppliers
              SET email_status = 'bounced'
              WHERE LOWER(email) = ${email}
            `);
          }
          break;
        }

        case "open": {
          // Supplier opened the email → update engagement score
          await db.execute(sql`
            UPDATE scraped_suppliers
            SET email_opens = COALESCE(email_opens, 0) + 1,
                last_engaged_at = NOW(),
                email_status = COALESCE(email_status, 'active')
            WHERE LOWER(email) = ${email}
          `);
          await db.execute(sql`
            UPDATE suppliers
            SET last_email_opened_at = NOW()
            WHERE LOWER(email) = ${email}
          `);
          break;
        }

        case "click": {
          // Supplier clicked a link (high-intent signal — likely viewed RFQ)
          await db.execute(sql`
            UPDATE scraped_suppliers
            SET email_clicks = COALESCE(email_clicks, 0) + 1,
                last_engaged_at = NOW(),
                email_status = COALESCE(email_status, 'active')
            WHERE LOWER(email) = ${email}
          `);
          // Log the click for analytics
          await db.execute(sql`
            INSERT INTO email_engagement_log (email, event_type, url, occurred_at)
            VALUES (${email}, 'click', ${event.url || null}, NOW())
            ON CONFLICT DO NOTHING
          `).catch(() => {
            // Table may not exist yet — non-fatal
          });
          break;
        }

        case "unsubscribe":
        case "spam": {
          // Permanent suppression — never email this address again
          await db.execute(sql`
            INSERT INTO email_suppression_list (email, reason, suppressed_at, permanent)
            VALUES (${email}, ${event.event}, NOW(), true)
            ON CONFLICT (email) DO UPDATE SET
              reason = EXCLUDED.reason,
              suppressed_at = NOW(),
              permanent = true
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

        case "delivered": {
          // Confirm delivery — update status if previously unknown
          await db.execute(sql`
            UPDATE scraped_suppliers
            SET email_status = COALESCE(NULLIF(email_status, 'unknown'), 'delivered')
            WHERE LOWER(email) = ${email}
          `);
          break;
        }
      }
    }

    res.status(200).json({ received: events.length });
  } catch (error) {
    console.error("[zeptomail-webhook] Error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

/**
 * Check if an email address is suppressed before sending
 * Call this before any outbound email to scraped/external suppliers
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
    return false; // Fail open — don't block sends if DB check fails
  }
}
