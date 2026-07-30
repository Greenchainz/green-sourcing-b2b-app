/**
 * CSRF protection middleware.
 *
 * The session cookie is already SameSite=Lax + HttpOnly, which blocks
 * cross-origin form POSTs from ever including the cookie. This middleware
 * adds an explicit Origin/Referer check as a defence-in-depth layer that
 * catches any remaining CSRF vectors (e.g. same-site subdomain requests,
 * misconfigured proxies that strip SameSite attributes).
 *
 * ## What is checked
 *  - All state-changing requests (POST, PUT, PATCH, DELETE)
 *  - With an authenticated session cookie present
 *
 * ## What is exempt
 *  - GET / HEAD / OPTIONS / TRACE (safe methods)
 *  - Webhook endpoints (have their own signature verification)
 *  - OAuth callback routes (/api/auth/*) — have their own state parameter
 *  - Health check endpoints
 *  - Requests with no session cookie (unauthenticated — TRPC already rejects)
 *
 * ## How it works
 *  The browser always sends Origin on cross-origin requests (and increasingly
 *  on same-origin ones too). When Origin is absent the fallback is Referer.
 *  If neither is present the request is permitted — this handles curl, Postman,
 *  server-to-server calls, and mobile apps which legitimately omit Origin.
 *
 *  When either header IS present, its hostname must match an allowed origin.
 *
 * IMPORTANT: Keep ALLOWED_ORIGINS in sync with ALLOWED_EXTERNAL_ORIGINS in
 * oauth-providers.ts and the APP_BASE_URL / AZURE_FORMA_ORIGIN env vars.
 */

import type { Request, Response, NextFunction } from "express";
import { logger } from "./logger.js";

// ── Allowed origins ───────────────────────────────────────────────────────────

/**
 * Hostnames (no scheme, no path) that are allowed to make state-changing
 * requests. Evaluated at middleware installation time so env vars are resolved
 * after loadSecrets() runs.
 */
function buildAllowedOrigins(): Set<string> {
  const origins = new Set<string>([
    "greenchainz.com",
    "www.greenchainz.com",
    // Staging / preview containers
    "staging.greenchainz.com",
  ]);

  // Allow the locally configured APP_BASE_URL hostname (dev + staging)
  const baseUrl = process.env.APP_BASE_URL;
  if (baseUrl) {
    try {
      origins.add(new URL(baseUrl).hostname);
    } catch {
      // Malformed — ignore
    }
  }

  // Local development
  origins.add("localhost");
  origins.add("127.0.0.1");
  origins.add("::1");

  // Autodesk Forma extension (iframe host)
  const formaOrigin = process.env.AZURE_FORMA_ORIGIN;
  if (formaOrigin) {
    try {
      origins.add(new URL(formaOrigin).hostname);
    } catch {
      // Malformed — ignore
    }
  }

  return origins;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function extractHostname(headerValue: string): string | null {
  try {
    // Origin header value is a full origin (scheme + host [+ port])
    // Referer header value is a full URL
    const url = new URL(headerValue);
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

// ── Route exemptions ──────────────────────────────────────────────────────────

function isExemptPath(path: string): boolean {
  // OAuth callbacks and initiation have their own state param CSRF protection
  if (path.startsWith("/api/auth/")) return true;
  // Webhooks carry cryptographic signatures — Origin checks are inappropriate
  if (path.startsWith("/api/webhooks/")) return true;
  if (path === "/api/marketplace-webhook") return true;
  if (path === "/api/microsoft-webhook") return true;
  if (path.startsWith("/api/acs-call-events")) return true;
  if (path.startsWith("/api/zeptomail-webhook")) return true;
  // Health probes
  if (path === "/health" || path === "/healthz" || path === "/ready" || path === "/api/health") return true;
  return false;
}

// ── Middleware factory ────────────────────────────────────────────────────────

export function csrfProtection() {
  const allowedOrigins = buildAllowedOrigins();

  return function csrfMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    // Safe HTTP methods never mutate state — no CSRF risk
    const method = req.method.toUpperCase();
    if (["GET", "HEAD", "OPTIONS", "TRACE"].includes(method)) {
      next();
      return;
    }

    // Exempt specific paths
    if (isExemptPath(req.path)) {
      next();
      return;
    }

    // Only enforce when a session cookie is present — unauthenticated requests
    // are already rejected by protectedProcedure / requireEasyAuthUser.
    const hasCookie = Boolean(req.headers.cookie?.includes("app_session_id"));
    if (!hasCookie) {
      next();
      return;
    }

    const originHeader = req.headers.origin;
    const refererHeader = req.headers.referer;

    // When neither header is present (curl, Postman, server-to-server), allow.
    // Browsers always send Origin on mutating cross-origin requests.
    if (!originHeader && !refererHeader) {
      next();
      return;
    }

    // Validate the Origin header first (more reliable than Referer)
    const candidateHeader = originHeader ?? refererHeader;
    const hostname = extractHostname(String(candidateHeader));

    if (!hostname) {
      logger.warn(
        { method, path: req.path, origin: originHeader, referer: refererHeader, requestId: req.id },
        "[csrf] Rejected: unparseable origin/referer"
      );
      res.status(403).json({ error: "CSRF validation failed", request_id: req.id });
      return;
    }

    // Allow exact hostname match and localhost variants (dev)
    if (
      allowedOrigins.has(hostname) ||
      hostname === "localhost" ||
      hostname.endsWith(".localhost")
    ) {
      next();
      return;
    }

    logger.warn(
      { method, path: req.path, origin: originHeader, referer: refererHeader, hostname, requestId: req.id },
      "[csrf] Rejected: origin not in allowlist"
    );
    res.status(403).json({ error: "CSRF validation failed", request_id: req.id });
  };
}
