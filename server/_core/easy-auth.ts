/**
 * Azure Container Apps Easy Auth Integration
 *
 * When Easy Auth is enabled on the Container App, the sidecar proxy:
 *   1. Handles all /.auth/* routes (login, callback, logout, me)
 *   2. Injects identity headers into every request that reaches our Express app:
 *      - X-MS-CLIENT-PRINCIPAL-ID    (unique user ID from the identity provider) ← authoritative
 *      - X-MS-CLIENT-PRINCIPAL-IDP   (identity provider: aad, google, linkedin)  ← authoritative
 *      - X-MS-CLIENT-PRINCIPAL-NAME  (display name or email)                     ← authoritative
 *      - X-MS-CLIENT-PRINCIPAL       (Base64-encoded JSON with full claims list)  ← supplementary
 *
 * IMPORTANT: The X-MS-CLIENT-PRINCIPAL base64 JSON uses "auth_typ" (not
 * "identityProvider") and does NOT always include a top-level "userId" field.
 * Always use the individual -ID / -IDP / -NAME headers as the primary source.
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
 * Parse the X-MS-CLIENT-PRINCIPAL header (Base64-encoded JSON) for claims only.
 * The JSON uses "auth_typ" not "identityProvider", so we only use it for claims.
 */
function parseClaimsHeader(headerValue: string | undefined): EasyAuthClaim[] {
  if (!headerValue) return [];
  try {
    const json = Buffer.from(headerValue, "base64").toString("utf-8");
    const parsed = JSON.parse(json);
    // Azure Container Apps format: { auth_typ, claims: [{typ, val}], name_typ, role_typ }
    // App Service format: { identityProvider, userId, userDetails, userRoles, claims: [{typ, val}] }
    return Array.isArray(parsed.claims) ? parsed.claims : [];
  } catch {
    console.warn("[EasyAuth] Failed to parse X-MS-CLIENT-PRINCIPAL claims header");
    return [];
  }
}

/**
 * Extract a specific claim value by its type URI.
 */
function getClaim(claims: EasyAuthClaim[], claimType: string): string | undefined {
  return claims.find((c) => c.typ === claimType)?.val;
}

/**
 * Extract the email from claims (different providers use different claim types).
 */
function extractEmailFromClaims(claims: EasyAuthClaim[], fallback: string): string {
  return (
    getClaim(claims, "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress") ??
    getClaim(claims, "preferred_username") ??
    getClaim(claims, "email") ??
    fallback
  );
}

/**
 * Extract the display name from claims.
 */
function extractNameFromClaims(claims: EasyAuthClaim[], fallback: string): string {
  return (
    getClaim(claims, "name") ??
    getClaim(claims, "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name") ??
    getClaim(claims, "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname") ??
    fallback
  );
}

/**
 * Map the Azure IDP identifier to a stable provider prefix.
 */
function mapProvider(idp: string): string {
  const providerMap: Record<string, string> = {
    aad: "microsoft",
    google: "google",
    linkedin: "linkedin",
  };
  return providerMap[idp] ?? idp;
}

// ── Middleware ────────────────────────────────────────────────────────────────

/**
 * Express middleware: parse Easy Auth headers and attach to req.
 *
 * Uses the individual X-MS-CLIENT-PRINCIPAL-ID/IDP/NAME headers as the
 * authoritative source (always set by Azure Container Apps Easy Auth when
 * a user is authenticated). The base64 X-MS-CLIENT-PRINCIPAL header is
 * parsed only for its claims array.
 *
 * Does NOT reject unauthenticated requests — that's left to individual routes.
 */
export function easyAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  const userId   = req.headers["x-ms-client-principal-id"]   as string | undefined;
  const idp      = req.headers["x-ms-client-principal-idp"]  as string | undefined;
  const userName = req.headers["x-ms-client-principal-name"] as string | undefined;
  const rawB64   = req.headers["x-ms-client-principal"]      as string | undefined;

  if (userId && idp) {
    const claims = parseClaimsHeader(rawB64);
    req.easyAuthPrincipal = {
      identityProvider: idp,
      userId,
      userDetails: userName ?? "",
      userRoles: [],
      claims,
    };
  }

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
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const provider = mapProvider(principal.identityProvider);
    const openId   = `${provider}:${principal.userId}`;
    const email    = extractEmailFromClaims(principal.claims, principal.userDetails);
    const name     = extractNameFromClaims(principal.claims, principal.userDetails);

    // Determine role — greenchainz.com addresses get admin
    let assignedRole: "buyer" | "supplier" | "admin" | "user" = "buyer";
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
        role: assignedRole,
      });
    } catch (err) {
      console.warn("[EasyAuth] DB upsert failed:", err);
    }

    // Look up user to get the authoritative role and numeric DB id
    const dbUser = await db.getUserByOpenId(openId);
    const role   = dbUser?.role ?? assignedRole;

    res.json({
      user: {
        id: openId,
        dbId: dbUser?.id ?? null,   // numeric DB id for tRPC procedures that need it
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
    res.json({ success: true, redirectTo: "/.auth/logout?post_logout_redirect_uri=/" });
  });

  app.get("/api/auth/logout", (_req: Request, res: Response) => {
    res.redirect(302, "/.auth/logout?post_logout_redirect_uri=/");
  });
}
