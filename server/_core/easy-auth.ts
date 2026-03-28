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

import type { Express, Request, Response, NextFunction, RequestHandler } from "express";
import * as db from "../db";
import { sdk } from "./sdk";
import { getSessionCookieOptions } from "./cookies";
import { ONE_YEAR_MS } from "@shared/const";

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

// ── Role helpers ─────────────────────────────────────────────────────────────

/**
 * Derive the app role from an Express request.
 *
 * Sources (in priority order):
 *   1. Azure app-role claim injected by Easy Auth (requires app role assignments in Entra)
 *   2. DB user role if the context user is available (set on req by easyAuthMiddleware)
 *
 * Defaults to 'architect' — never blocks an unknown user.
 *
 * Note: 'architect' is what the DB stores as 'buyer'. The mapping lives in the
 * API client (api-client.ts) for client-facing code.
 */
export function getUserRole(req: Request): "architect" | "supplier" | "admin" {
  const principal = req.easyAuthPrincipal;
  if (!principal) return "architect";

  // Check Azure app-role claims (requires "App roles" configured in Entra app manifest)
  const roleClaim =
    principal.claims.find(
      (c) =>
        c.typ === "http://schemas.microsoft.com/ws/2008/06/identity/claims/role" ||
        c.typ === "roles"
    )?.val ?? "";

  if (roleClaim === "admin") return "admin";
  if (roleClaim === "supplier") return "supplier";
  return "architect";
}

/**
 * Express middleware: only allow admin users.
 */
export const requireAdmin: RequestHandler = (req, res, next) => {
  if (getUserRole(req) !== "admin") {
    return void res.status(403).json({ error: "Admin access required." });
  }
  next();
};

/**
 * Express middleware: only allow supplier users.
 */
export const requireSupplier: RequestHandler = (req, res, next) => {
  const role = getUserRole(req);
  if (role !== "supplier" && role !== "admin") {
    return void res.status(403).json({ error: "Supplier access required." });
  }
  next();
};

/**
 * Express middleware: only allow architect (or admin) users.
 * Architects are the default — virtually all new users pass this check.
 */
export const requireArchitect: RequestHandler = (req, res, next) => {
  const role = getUserRole(req);
  if (role !== "architect" && role !== "admin") {
    return void res.status(403).json({ error: "Architect access required." });
  }
  next();
};

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
  // When Easy Auth headers are present (production sidecar or dev shim request),
  // handle here. Otherwise call next() so the oauth-providers JWT handler runs.
  app.get("/api/auth/me", async (req: Request, res: Response, next: NextFunction) => {
    const principal = req.easyAuthPrincipal;

    if (!principal) {
      return next(); // fall through to oauth-providers /api/auth/me
    }

    const provider = mapProvider(principal.identityProvider);
    const openId   = `${provider}:${principal.userId}`;
    const email    = extractEmailFromClaims(principal.claims, principal.userDetails);
    const name     = extractNameFromClaims(principal.claims, principal.userDetails);

    // Check the DB first so we never overwrite a manually-set role on every login.
    // Role is only derived here for brand-new accounts (first login).
    // TODO: Once migrate-admin-roles.ts has been run against production, remove the
    //       @greenchainz.com fallback and rely solely on DB-stored roles.
    const existingUser = await db.getUserByOpenId(openId);
    const roleForInsert: "buyer" | "admin" | undefined = existingUser
      ? undefined  // returning user — preserve whatever the DB has
      : email.endsWith("@greenchainz.com") ? "admin" : "buyer";  // first login bootstrap

    // Upsert user into database
    try {
      await db.upsertUser({
        openId,
        email,
        name,
        loginMethod: provider,
        lastSignedIn: new Date(),
        ...(roleForInsert !== undefined && { role: roleForInsert }),
      });
    } catch (err) {
      console.warn("[EasyAuth] DB upsert failed:", err);
    }

    // Look up the now-upserted record; fall back to bootstrap value only if DB write failed
    const dbUser = existingUser ?? await db.getUserByOpenId(openId);
    const role   = dbUser?.role ?? roleForInsert ?? "buyer";

    res.json({
      user: {
        id: String(dbUser?.id ?? openId),  // numeric DB id as string (consistent with oauth-providers)
        email,
        name,
        roles: [role],
        isAdmin: role === "admin",
        isSupplier: role === "supplier",
        // isArchitect: true for all non-supplier, non-admin users (DB stores as 'buyer')
        isArchitect: role !== "admin" && role !== "supplier",
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

// ── LOCAL DEV: Simulate Easy Auth /.auth/login/aad ───────────────────────────
// In production, Azure Container Apps sidecar handles this automatically.
// This dev shim redirects to real Microsoft login so OAuth works locally.
export function registerDevAuthShim(app: Express) {
  if (process.env.NODE_ENV === "production") return;

  app.get("/.auth/login/aad", (req: Request, res: Response) => {
    const base = process.env.OAUTH_SERVER_URL;
    const clientId = "479e2a01-70ab-4df9-baa4-560d317c3423";
    const redirectUri = encodeURIComponent("http://localhost:3001/.auth/callback");
    const stateObj = { role: "buyer", returnPath: String(req.query.post_login_redirect_uri || "/dashboard") };
    const state = Buffer.from(JSON.stringify(stateObj)).toString("base64");
    const url = `${base}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=openid+profile+email&state=${state}`;
    res.redirect(302, url);
  });

  // Google login in production is handled by Entra External ID (Easy Auth sidecar).
  // In local dev, redirect back to /login with a hint to use email/password instead.
  app.get("/.auth/login/google", (req: Request, res: Response) => {
    const returnPath = encodeURIComponent(String(req.query.post_login_redirect_uri || "/dashboard"));
    res.redirect(302, `/login?returnPath=${returnPath}&error=google_dev_unsupported`);
  });
}

// ── LOCAL DEV: Direct Microsoft token exchange (bypasses Replit SDK) ─────────
export function registerDevCallbackHandler(app: Express) {
  if (process.env.NODE_ENV === "production") return;

  app.get("/.auth/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string;
    if (!code) return res.status(400).json({ error: "No code" });

    // Parse returnPath from state
    let returnPath = "/dashboard";
    const stateStr = req.query.state as string;
    if (stateStr) {
      try {
        const decoded = JSON.parse(Buffer.from(stateStr, "base64").toString());
        returnPath = decoded.returnPath || "/dashboard";
      } catch { /* ignore */ }
    }

    const params = new URLSearchParams({
      client_id: "479e2a01-70ab-4df9-baa4-560d317c3423",
      client_secret: process.env.MICROSOFT_CLIENT_SECRET || process.env.CLIENT_SECRET || "",
      code,
      redirect_uri: "http://localhost:3001/.auth/callback",
      grant_type: "authorization_code",
      scope: "openid profile email",
    });

    try {
      const tokenRes = await fetch(
        `https://login.microsoftonline.com/ca4f78d4-c753-4893-9cd8-1b309922b4dc/oauth2/v2.0/token`,
        { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params }
      );
      const tokens = await tokenRes.json() as any;
      if (tokens.error) return res.status(401).json(tokens);

      // Decode id_token to get user info
      const idToken = tokens.id_token;
      const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString());

      const openId = `microsoft:${payload.oid || payload.sub}`;
      const email  = payload.email || payload.preferred_username || "";
      const name   = payload.name || email;

      // Upsert user into DB
      await db.upsertUser({
        openId,
        email,
        name,
        loginMethod: "microsoft",
        lastSignedIn: new Date(),
      }).catch((err: unknown) => console.warn("[DevAuth] upsertUser failed:", err));

      // Create proper app_session_id JWT cookie (same as oauth-providers flow)
      const sessionToken = await sdk.createSessionToken(openId, { name, expiresInMs: ONE_YEAR_MS });
      res.cookie("app_session_id", sessionToken, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
      res.redirect(302, returnPath);
    } catch (err) {
      console.error("[DevAuth] Token exchange failed", err);
      res.status(500).json({ error: "Token exchange failed" });
    }
  });
}
