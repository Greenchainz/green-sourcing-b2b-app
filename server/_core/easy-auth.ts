/**
 * Azure Container Apps Easy Auth Integration
 *
 * When Easy Auth is enabled on the Container App, the sidecar proxy:
 *   1. Handles all /.auth/* routes (login, callback, logout, me)
 *   2. Injects identity headers into every request that reaches our Express app:
 *      - X-MS-CLIENT-PRINCIPAL       (Base64-encoded JSON with claims)
 *      - X-MS-CLIENT-PRINCIPAL-NAME   (display name or email)
 *      - X-MS-CLIENT-PRINCIPAL-ID     (unique user ID from the identity provider)
 *      - X-MS-CLIENT-PRINCIPAL-IDP    (identity provider name: aad, google, linkedin)
 *
 * This module:
 *   - Parses those headers into a typed EasyAuthPrincipal
 *   - Provides an Express middleware that attaches the principal to req
 *   - Registers /api/auth/me so the frontend can get a normalised user object
 *   - Upserts the user into our database on every authenticated request
 */

import type { Express, Request, Response, NextFunction } from "express";
import * as db from "../db";

// ── Types ────────────────────────────────────────────────────────────────────

export interface EasyAuthClaim {
  typ: string;
  val: string;
}

export interface EasyAuthPrincipal {
  identityProvider: string;   // "aad" | "google" | "linkedin"
  userId: string;             // unique ID from the provider
  userDetails: string;        // display name or email
  userRoles: string[];        // roles assigned by the provider
  claims: EasyAuthClaim[];    // full list of claims
}

// Extend Express Request to carry the parsed principal
declare global {
  namespace Express {
    interface Request {
      easyAuthPrincipal?: EasyAuthPrincipal;
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse the X-MS-CLIENT-PRINCIPAL header (Base64-encoded JSON).
 * Returns null if the header is missing or malformed.
 */
function parsePrincipalHeader(headerValue: string | undefined): EasyAuthPrincipal | null {
  if (!headerValue) return null;
  try {
    const json = Buffer.from(headerValue, "base64").toString("utf-8");
    return JSON.parse(json) as EasyAuthPrincipal;
  } catch {
    console.warn("[EasyAuth] Failed to parse X-MS-CLIENT-PRINCIPAL header");
    return null;
  }
}

/**
 * Extract a specific claim value by its type URI.
 */
function getClaim(principal: EasyAuthPrincipal, claimType: string): string | undefined {
  return principal.claims.find((c) => c.typ === claimType)?.val;
}

/**
 * Extract the email from the principal's claims (different providers use different claim types).
 */
function extractEmail(principal: EasyAuthPrincipal): string {
  return (
    getClaim(principal, "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress") ??
    getClaim(principal, "preferred_username") ??
    getClaim(principal, "email") ??
    principal.userDetails ??
    ""
  );
}

/**
 * Extract the display name from the principal's claims.
 */
function extractName(principal: EasyAuthPrincipal): string {
  return (
    getClaim(principal, "name") ??
    getClaim(principal, "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name") ??
    getClaim(principal, "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname") ??
    principal.userDetails ??
    ""
  );
}

/**
 * Build a stable openId that matches our database schema.
 * Format: "<provider>:<provider-user-id>"
 */
function buildOpenId(principal: EasyAuthPrincipal): string {
  const providerMap: Record<string, string> = {
    aad: "microsoft",
    google: "google",
    linkedin: "linkedin",
  };
  const prefix = providerMap[principal.identityProvider] ?? principal.identityProvider;
  return `${prefix}:${principal.userId}`;
}

// ── Middleware ────────────────────────────────────────────────────────────────

/**
 * Express middleware: parse Easy Auth headers and attach to req.
 * Does NOT reject unauthenticated requests — that's left to individual routes.
 */
export function easyAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  const raw = req.headers["x-ms-client-principal"] as string | undefined;
  req.easyAuthPrincipal = parsePrincipalHeader(raw) ?? undefined;
  next();
}

// ── Route registration ───────────────────────────────────────────────────────

/**
 * Register Easy Auth routes on the Express app:
 *   GET /api/auth/me  — returns the current user (from Easy Auth headers)
 *   POST /api/auth/logout — redirects to Easy Auth logout (kept for API compatibility)
 */
export function registerEasyAuthRoutes(app: Express) {
  // Apply the middleware globally so every route can access easyAuthPrincipal
  app.use(easyAuthMiddleware);

  // ── GET /api/auth/me ──────────────────────────────────────────────────────
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    const principal = req.easyAuthPrincipal;

    if (!principal) {
      // Fallback: check for X-MS-CLIENT-PRINCIPAL-ID header directly
      const principalId = req.headers["x-ms-client-principal-id"] as string | undefined;
      const principalName = req.headers["x-ms-client-principal-name"] as string | undefined;
      const principalIdp = req.headers["x-ms-client-principal-idp"] as string | undefined;

      if (principalId && principalIdp) {
        // Minimal principal from individual headers
        const openId = `${principalIdp === "aad" ? "microsoft" : principalIdp}:${principalId}`;
        const email = principalName ?? "";
        const name = principalName ?? "";

        // Upsert user
        try {
          await db.upsertUser({
            openId,
            email,
            name,
            loginMethod: principalIdp === "aad" ? "microsoft" : principalIdp,
            lastSignedIn: new Date(),
          });
        } catch (err) {
          console.warn("[EasyAuth] DB upsert failed (header fallback):", err);
        }

        // Look up user to get role
        const dbUser = await db.getUserByOpenId(openId);
        const role = dbUser?.role ?? "buyer";

        res.json({
          user: {
            id: openId,
            email,
            name,
            roles: [role],
            isAdmin: role === "admin",
            isSupplier: role === "supplier",
          },
        });
        return;
      }

      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    // Full principal available
    const openId = buildOpenId(principal);
    const email = extractEmail(principal);
    const name = extractName(principal);
    const provider = principal.identityProvider === "aad" ? "microsoft" : principal.identityProvider;

    // Determine role
    let assignedRole: string = "buyer";
    if (email.endsWith("@greenchainz.com")) {
      assignedRole = "admin";
    }

    // Upsert user into database
    try {
      await db.upsertUser({
        openId,
        email,
        name,
        loginMethod: provider,
        lastSignedIn: new Date(),
        role: assignedRole as "buyer" | "supplier" | "admin" | "user",
      });
    } catch (err) {
      console.warn("[EasyAuth] DB upsert failed:", err);
    }

    // Look up user to get the authoritative role from DB
    const dbUser = await db.getUserByOpenId(openId);
    const role = dbUser?.role ?? assignedRole;

    res.json({
      user: {
        id: openId,
        email,
        name,
        roles: [role],
        isAdmin: role === "admin",
        isSupplier: role === "supplier",
      },
    });
  });

  // ── POST /api/auth/logout (API compat — frontend uses /.auth/logout) ──────
  app.post("/api/auth/logout", (_req: Request, res: Response) => {
    // Easy Auth manages the session cookie; we just redirect
    res.json({ success: true, redirectTo: "/.auth/logout?post_logout_redirect_uri=/" });
  });

  app.get("/api/auth/logout", (_req: Request, res: Response) => {
    res.redirect(302, "/.auth/logout?post_logout_redirect_uri=/");
  });
}
