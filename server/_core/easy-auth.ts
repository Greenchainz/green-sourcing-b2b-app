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

function parseClaimsHeader(headerValue: string | undefined): EasyAuthClaim[] {
  if (!headerValue) return [];
  try {
    const json = Buffer.from(headerValue, "base64").toString("utf-8");
    const parsed = JSON.parse(json);
    return Array.isArray(parsed.claims) ? parsed.claims : [];
  } catch {
    console.warn("[EasyAuth] Failed to parse X-MS-CLIENT-PRINCIPAL claims header");
    return [];
  }
}

function getClaim(claims: EasyAuthClaim[], claimType: string): string | undefined {
  return claims.find((c) => c.typ === claimType)?.val;
}

function extractEmailFromClaims(claims: EasyAuthClaim[], fallback: string): string {
  return (
    getClaim(claims, "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress") ??
    getClaim(claims, "preferred_username") ??
    getClaim(claims, "email") ??
    fallback
  );
}

function extractNameFromClaims(claims: EasyAuthClaim[], fallback: string): string {
  return (
    getClaim(claims, "name") ??
    getClaim(claims, "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name") ??
    getClaim(claims, "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname") ??
    fallback
  );
}

function mapProvider(idp: string): string {
  const providerMap: Record<string, string> = {
    aad: "microsoft",
    google: "google",
    linkedin: "linkedin",
  };
  return providerMap[idp] ?? idp;
}

// ── Middleware ────────────────────────────────────────────────────────────────

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

// ── Route registration ────────────────────────────────────────────────────────

export function registerEasyAuthRoutes(app: Express) {
  app.use(easyAuthMiddleware);

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

    let assignedRole: "buyer" | "supplier" | "admin" | "user" = "buyer";
    if (email.endsWith("@greenchainz.com")) {
      assignedRole = "admin";
    }

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

    const dbUser = await db.getUserByOpenId(openId);
    const role   = dbUser?.role ?? assignedRole;

    res.json({
      user: {
        id: openId,
        dbId: dbUser?.id ?? null,
        email,
        name,
        roles: [role],
        isAdmin: role === "admin",
        isSupplier: role === "supplier",
      },
    });
  });

  app.post("/api/auth/logout", (_req: Request, res: Response) => {
    res.json({ success: true, redirectTo: "/.auth/logout?post_logout_redirect_uri=/" });
  });

  app.get("/api/auth/logout", (_req: Request, res: Response) => {
    res.redirect(302, "/.auth/logout?post_logout_redirect_uri=/");
  });
}

// ── LOCAL DEV ONLY: Simulate Easy Auth /.auth/* routes ───────────────────────
// In production, Azure Container Apps sidecar handles these automatically.
// Locally we replicate login + token exchange directly against Microsoft.

const DEV_TENANT_ID  = "ca4f78d4-c753-4893-9cd8-1b309922b4dc";
const DEV_CLIENT_ID  = "479e2a01-70ab-4df9-baa4-560d317c3423";
const DEV_CALLBACK   = "http://localhost:3001/.auth/callback";

export function registerDevAuthShim(app: Express) {
  if (process.env.NODE_ENV === "production") return;

  // Step 1: Redirect to Microsoft login
  app.get("/.auth/login/aad", (req: Request, res: Response) => {
    const postLoginRedirect = String(req.query.post_login_redirect_uri || "/dashboard");
    // state = base64(redirectPath) so we can recover it after callback
    const state = Buffer.from(postLoginRedirect).toString("base64");
    const params = new URLSearchParams({
      client_id: DEV_CLIENT_ID,
      response_type: "code",
      redirect_uri: DEV_CALLBACK,
      scope: "openid profile email",
      state,
    });
    res.redirect(302, `https://login.microsoftonline.com/${DEV_TENANT_ID}/oauth2/v2.0/authorize?${params}`);
  });

  app.get("/.auth/login/google", (_req: Request, res: Response) => {
    res.redirect(302, "/.auth/login/aad");
  });

  // Step 2: Exchange code for tokens directly with Microsoft (bypasses Replit SDK)
  app.get("/.auth/callback", async (req: Request, res: Response) => {
    const code  = req.query.code  as string | undefined;
    const state = req.query.state as string | undefined;

    if (!code) {
      res.status(400).json({ error: "Missing code from Microsoft" });
      return;
    }

    const clientSecret =
      process.env.MICROSOFT_CLIENT_SECRET ||
      process.env.CLIENT_SECRET ||
      "";

    if (!clientSecret) {
      console.error("[DevAuth] MICROSOFT_CLIENT_SECRET not set in .env.local");
      res.status(500).json({ error: "MICROSOFT_CLIENT_SECRET not configured" });
      return;
    }

    const params = new URLSearchParams({
      client_id:     DEV_CLIENT_ID,
      client_secret: clientSecret,
      code,
      redirect_uri:  DEV_CALLBACK,
      grant_type:    "authorization_code",
      scope:         "openid profile email",
    });

    try {
      const tokenRes = await fetch(
        `https://login.microsoftonline.com/${DEV_TENANT_ID}/oauth2/v2.0/token`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body:    params.toString(),
        }
      );

      const tokens = await tokenRes.json() as any;

      if (tokens.error) {
        console.error("[DevAuth] Token exchange error:", tokens);
        res.status(401).json({ error: tokens.error_description || tokens.error });
        return;
      }

      // Decode id_token JWT (no signature verification needed locally)
      const idPayload = JSON.parse(
        Buffer.from(tokens.id_token.split(".")[1], "base64url").toString("utf-8")
      );

      const userId   = idPayload.oid || idPayload.sub;
      const email    = idPayload.preferred_username || idPayload.email || "";
      const name     = idPayload.name || email;

      // Upsert user into DB
      try {
        await db.upsertUser({
          openId:      `microsoft:${userId}`,
          email,
          name,
          loginMethod: "microsoft",
          lastSignedIn: new Date(),
          role:        email.endsWith("@greenchainz.com") ? "admin" : "buyer",
        });
      } catch (err) {
        console.warn("[DevAuth] DB upsert failed:", err);
      }

      // Inject Easy Auth headers so /api/auth/me works immediately after redirect
      // (these only persist for this request; subsequent requests use the cookie below)
      res.setHeader("x-ms-client-principal-id",   userId);
      res.setHeader("x-ms-client-principal-idp",  "aad");
      res.setHeader("x-ms-client-principal-name", email);

      // Store a lightweight session cookie (access token) for subsequent requests
      res.cookie("dev-ms-token", tokens.access_token, {
        httpOnly: true,
        sameSite: "lax",
        maxAge:   tokens.expires_in * 1000,
      });

      // Recover post-login redirect from state
      let returnPath = "/dashboard";
      if (state) {
        try { returnPath = Buffer.from(state, "base64").toString("utf-8"); } catch {}
      }

      console.log(`[DevAuth] ✅ Login success: ${email} → ${returnPath}`);
      res.redirect(302, returnPath);

    } catch (err) {
      console.error("[DevAuth] Token exchange failed:", err);
      res.status(500).json({ error: "Token exchange failed" });
    }
  });

  // Step 3: Dev logout — clear cookie and redirect home
  app.get("/.auth/logout", (req: Request, res: Response) => {
    res.clearCookie("dev-ms-token");
    const postLogout = String(req.query.post_logout_redirect_uri || "/");
    res.redirect(302, postLogout);
  });
}
