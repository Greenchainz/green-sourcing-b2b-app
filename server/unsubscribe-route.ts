/**
 * Email unsubscribe endpoint.
 *
 * Wires the "Unsubscribe" links in transactional/marketing emails to the
 * `email_suppression_list` so `isEmailSuppressed()` will block all future
 * sends to that address. Required for CAN-SPAM / one-click List-Unsubscribe.
 *
 * Routes:
 *   GET  /unsubscribe?email=&token=   — human click → confirmation page
 *   POST /unsubscribe                 — RFC 8058 one-click (List-Unsubscribe-Post)
 *
 * Tokens: when JWT_SECRET is set, links we generate carry an HMAC token tying
 * the URL to the email so addresses can't be suppressed by guessing.
 */

import { Router } from "express";
import crypto from "node:crypto";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

export const unsubscribeRouter = Router();

const BASE_URL = process.env.FRONTEND_URL || "https://greenchainz.com";

/** HMAC token binding an email to an unsubscribe link. */
export function unsubscribeToken(email: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) return "";
  return crypto
    .createHmac("sha256", secret)
    .update(`unsub:${email.toLowerCase().trim()}`)
    .digest("hex")
    .slice(0, 32);
}

/** Build a tokened unsubscribe URL for use in email footers/headers. */
export function buildUnsubscribeUrl(email: string): string {
  const e = encodeURIComponent(email.toLowerCase().trim());
  const token = unsubscribeToken(email);
  return token
    ? `${BASE_URL}/unsubscribe?email=${e}&token=${token}`
    : `${BASE_URL}/unsubscribe?email=${e}`;
}

function tokenValid(email: string, token: string | undefined): boolean {
  // No server secret → can't verify; accept (legacy behaviour).
  const expected = unsubscribeToken(email);
  if (!expected) return true;
  if (!token) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function suppress(email: string): Promise<boolean> {
  const normalized = email.toLowerCase().trim();
  if (!normalized || !normalized.includes("@")) return false;

  const db = await getDb();
  if (!db) return false;

  await db.execute(sql`
    INSERT INTO email_suppression_list (email, reason, suppressed_at, permanent)
    VALUES (${normalized}, 'unsubscribe', NOW(), true)
    ON CONFLICT (email) DO UPDATE SET
      reason        = 'unsubscribe',
      suppressed_at = NOW(),
      permanent     = true
  `);

  // Best-effort: reflect opt-out on the supplier/lead records too.
  await db
    .execute(sql`UPDATE suppliers SET email_status = 'unsubscribed' WHERE LOWER(email) = ${normalized}`)
    .catch(() => { });
  await db
    .execute(sql`UPDATE scraped_suppliers SET email_status = 'unsubscribed' WHERE LOWER(email) = ${normalized}`)
    .catch(() => { });

  return true;
}

function page(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — GreenChainz</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background:#f9fafb; color:#111827; display:flex; min-height:100vh; align-items:center; justify-content:center; margin:0; }
    .card { background:#fff; max-width:460px; padding:40px; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,0.1); text-align:center; }
    h1 { color:#059669; font-size:22px; margin:0 0 12px; }
    p { color:#6b7280; line-height:1.6; margin:0 0 8px; }
    a { color:#059669; font-weight:600; text-decoration:none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <p style="margin-top:20px;"><a href="${BASE_URL}">Return to GreenChainz</a></p>
  </div>
</body>
</html>`;
}

unsubscribeRouter.get("/unsubscribe", async (req, res) => {
  const email = String(req.query.email ?? "").toLowerCase().trim();
  const token = req.query.token ? String(req.query.token) : undefined;

  if (!email) {
    return res
      .status(400)
      .send(page("Invalid link", "This unsubscribe link is missing an email address."));
  }
  if (!tokenValid(email, token)) {
    return res
      .status(400)
      .send(page("Invalid link", "This unsubscribe link is invalid or has expired."));
  }

  try {
    const ok = await suppress(email);
    if (!ok) {
      return res
        .status(500)
        .send(page("Something went wrong", "We couldn't process your request. Please try again later."));
    }
    return res.status(200).send(
      page(
        "You're unsubscribed",
        `<strong>${escapeHtml(email)}</strong> has been removed from GreenChainz emails. You won't receive further messages at this address.`
      )
    );
  } catch (err) {
    console.error("[unsubscribe] failed:", err);
    return res
      .status(500)
      .send(page("Something went wrong", "We couldn't process your request. Please try again later."));
  }
});

// RFC 8058 one-click unsubscribe (List-Unsubscribe-Post). Mail clients POST here.
unsubscribeRouter.post("/unsubscribe", async (req, res) => {
  const email = String(req.query.email ?? req.body?.email ?? "").toLowerCase().trim();
  const token = req.query.token ? String(req.query.token) : req.body?.token;

  if (!email || !tokenValid(email, token)) {
    return res.status(400).json({ ok: false });
  }
  try {
    const ok = await suppress(email);
    return res.status(ok ? 200 : 500).json({ ok });
  } catch (err) {
    console.error("[unsubscribe] one-click failed:", err);
    return res.status(500).json({ ok: false });
  }
});
