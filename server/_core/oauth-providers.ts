/**
 * OAuth Provider Routes — Microsoft Entra ID, Google, LinkedIn
 *
 * Replaces the Manus OAuth flow with direct provider OAuth 2.0.
 * Session is stored as a signed JWT cookie (same mechanism as before).
 *
 * Flow:
 *   1. GET /api/auth/:provider  → redirect to provider
 *   2. GET /api/auth/callback/:provider → exchange code, upsert user, set cookie
 *   3. GET /api/auth/me         → return current user from session
 *   4. POST /api/auth/logout    → clear session cookie
 */

import crypto from "crypto";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ONE_YEAR_MS } from "@shared/const";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getEnv(key: string): string {
  return process.env[key] ?? "";
}

function buildRedirectUri(_req: Request, provider: string): string {
  // Always use the canonical production domain to avoid Container Apps internal domain mismatch
  const baseUrl = process.env.APP_BASE_URL || "https://greenchainz.com";
  return `${baseUrl}/api/auth/callback/${provider}`;
}

// In-memory state store (good enough for stateless container; use Redis for multi-replica)
const pendingStates = new Map<string, { returnPath: string; role: string | null; createdAt: number }>();

// Clean up states older than 10 minutes
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [key, val] of pendingStates.entries()) {
    if (val.createdAt < cutoff) pendingStates.delete(key);
  }
}, 60_000);

function createState(returnPath: string, role: string | null): string {
  const state = crypto.randomBytes(24).toString("hex");
  pendingStates.set(state, { returnPath, role, createdAt: Date.now() });
  return state;
}

function consumeState(state: string) {
  const data = pendingStates.get(state);
  if (data) pendingStates.delete(state);
  return data ?? { returnPath: "/", role: null };
}

// ── Provider configs ──────────────────────────────────────────────────────────

function getMicrosoftAuthUrl(redirectUri: string, state: string): string {
  const tenantId = getEnv("AZURE_AD_TENANT_ID") || "ca4f78d4-c753-4893-9cd8-1b309922b4dc";
  const clientId = getEnv("AZURE_AD_CLIENT_ID") || "479e2a01-70ab-4df9-baa4-560d317c3423";
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: "openid profile email offline_access User.Read",
    state,
  });
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params}`;
}

function getGoogleAuthUrl(redirectUri: string, state: string): string {
  const clientId = getEnv("GOOGLE_CLIENT_ID") || "856406055657-actjkcr6fd9hpvq6b0a7harehqscgj9d.apps.googleusercontent.com";
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "openid profile email",
    state,
    access_type: "offline",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

function getLinkedInAuthUrl(redirectUri: string, state: string): string {
  const clientId = getEnv("LINKEDIN_CLIENT_ID") || "77lzd3h7nzedke";
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: "openid profile email",
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
}

// ── Token exchange ────────────────────────────────────────────────────────────

interface OAuthUserInfo {
  openId: string;
  email: string | null;
  name: string | null;
  provider: string;
}

async function exchangeMicrosoftCode(code: string, redirectUri: string): Promise<OAuthUserInfo> {
  const tenantId = getEnv("AZURE_AD_TENANT_ID") || "ca4f78d4-c753-4893-9cd8-1b309922b4dc";
  const clientId = getEnv("AZURE_AD_CLIENT_ID") || "479e2a01-70ab-4df9-baa4-560d317c3423";
  const clientSecret = getEnv("AZURE_AD_CLIENT_SECRET");

  const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Microsoft token exchange failed: ${err}`);
  }

  const tokens = await tokenRes.json() as { access_token: string; id_token?: string };

  // Decode id_token to get user info (no extra call needed)
  if (tokens.id_token) {
    const [, payload] = tokens.id_token.split(".");
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString());
    return {
      openId: `microsoft:${decoded.oid ?? decoded.sub}`,
      email: decoded.email ?? decoded.preferred_username ?? null,
      name: decoded.name ?? null,
      provider: "microsoft",
    };
  }

  // Fallback: call Graph API
  const userRes = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const user = await userRes.json() as { id: string; mail?: string; userPrincipalName?: string; displayName?: string };
  return {
    openId: `microsoft:${user.id}`,
    email: user.mail ?? user.userPrincipalName ?? null,
    name: user.displayName ?? null,
    provider: "microsoft",
  };
}

async function exchangeGoogleCode(code: string, redirectUri: string): Promise<OAuthUserInfo> {
  const clientId = getEnv("GOOGLE_CLIENT_ID") || "856406055657-actjkcr6fd9hpvq6b0a7harehqscgj9d.apps.googleusercontent.com";
  const clientSecret = getEnv("GOOGLE_CLIENT_SECRET");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Google token exchange failed: ${err}`);
  }

  const tokens = await tokenRes.json() as { id_token?: string; access_token: string };

  if (tokens.id_token) {
    const [, payload] = tokens.id_token.split(".");
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString());
    return {
      openId: `google:${decoded.sub}`,
      email: decoded.email ?? null,
      name: decoded.name ?? null,
      provider: "google",
    };
  }

  // Fallback: userinfo endpoint
  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const user = await userRes.json() as { id: string; email?: string; name?: string };
  return {
    openId: `google:${user.id}`,
    email: user.email ?? null,
    name: user.name ?? null,
    provider: "google",
  };
}

async function exchangeLinkedInCode(code: string, redirectUri: string): Promise<OAuthUserInfo> {
  const clientId = getEnv("LINKEDIN_CLIENT_ID") || "77lzd3h7nzedke";
  const clientSecret = getEnv("LINKEDIN_CLIENT_SECRET");

  const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`LinkedIn token exchange failed: ${err}`);
  }

  const tokens = await tokenRes.json() as { access_token: string; id_token?: string };

  // LinkedIn OIDC id_token
  if (tokens.id_token) {
    const [, payload] = tokens.id_token.split(".");
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString());
    return {
      openId: `linkedin:${decoded.sub}`,
      email: decoded.email ?? null,
      name: decoded.name ?? null,
      provider: "linkedin",
    };
  }

  // Fallback: userinfo endpoint
  const userRes = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const user = await userRes.json() as { sub: string; email?: string; name?: string };
  return {
    openId: `linkedin:${user.sub}`,
    email: user.email ?? null,
    name: user.name ?? null,
    provider: "linkedin",
  };
}

// ── Route registration ────────────────────────────────────────────────────────

export function registerOAuthProviderRoutes(app: Express) {
  // ── Initiate OAuth flow ────────────────────────────────────────────────────
  app.get("/api/auth/:provider", (req: Request, res: Response) => {
    const { provider } = req.params;
    const returnPath = (req.query.returnPath as string) || "/";
    const role = (req.query.role as string) || null;

    const state = createState(returnPath, role);
    const redirectUri = buildRedirectUri(req, provider);

    let authUrl: string;
    try {
      switch (provider) {
        case "microsoft":
          authUrl = getMicrosoftAuthUrl(redirectUri, state);
          break;
        case "google":
          authUrl = getGoogleAuthUrl(redirectUri, state);
          break;
        case "linkedin":
          authUrl = getLinkedInAuthUrl(redirectUri, state);
          break;
        default:
          res.status(400).json({ error: `Unknown provider: ${provider}` });
          return;
      }
    } catch (err) {
      console.error("[Auth] Failed to build auth URL:", err);
      res.status(500).json({ error: "Failed to initiate OAuth flow" });
      return;
    }

    res.redirect(302, authUrl);
  });

  // ── OAuth callback ─────────────────────────────────────────────────────────
  app.get("/api/auth/callback/:provider", async (req: Request, res: Response) => {
    const { provider } = req.params;
    const code = req.query.code as string;
    const state = req.query.state as string;
    const error = req.query.error as string;

    if (error) {
      console.error(`[Auth] Provider error from ${provider}:`, error, req.query.error_description);
      res.redirect(302, `/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (!code || !state) {
      res.redirect(302, "/login?error=missing_code");
      return;
    }

    const { returnPath, role } = consumeState(state);
    const redirectUri = buildRedirectUri(req, provider);

    try {
      let userInfo: OAuthUserInfo;
      switch (provider) {
        case "microsoft":
          userInfo = await exchangeMicrosoftCode(code, redirectUri);
          break;
        case "google":
          userInfo = await exchangeGoogleCode(code, redirectUri);
          break;
        case "linkedin":
          userInfo = await exchangeLinkedInCode(code, redirectUri);
          break;
        default:
          res.redirect(302, "/login?error=unknown_provider");
          return;
      }

      // Determine role: admin if greenchainz.com email, else use provided role or default to buyer
      let assignedRole: "buyer" | "supplier" | "admin" | "user" = "buyer";
      if (userInfo.email?.endsWith("@greenchainz.com")) {
        assignedRole = "admin";
      } else if (role === "supplier") {
        assignedRole = "supplier";
      } else if (role === "buyer") {
        assignedRole = "buyer";
      }

      // Check if this is a new user before upserting
      const existingUser = await db.getUserByOpenId(userInfo.openId);
      const isNewUser = !existingUser;

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name,
        email: userInfo.email,
        loginMethod: userInfo.provider,
        lastSignedIn: new Date(),
        role: assignedRole,
      });

      // Send welcome email to new users (non-blocking)
      if (isNewUser && userInfo.email) {
        import("../notification-service").then(({ sendWelcomeEmail }) => {
          sendWelcomeEmail({
            name: userInfo.name ?? "there",
            email: userInfo.email!,
            role: assignedRole,
          }).catch((err: unknown) => console.warn("[Auth] Welcome email failed (non-critical):", err));
        }).catch(() => {});
      }

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name ?? "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie("app_session_id", sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, returnPath || "/");
    } catch (err) {
      console.error(`[Auth] Callback failed for ${provider}:`, err);
      res.redirect(302, `/login?error=callback_failed`);
    }
  });

  // ── Current user (REST endpoint for api-client.ts) ─────────────────────────
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      res.json({
        user: {
          id: String(user.id),
          email: user.email ?? "",
          name: user.name ?? "",
          roles: [user.role],
          isAdmin: user.role === "admin",
          isSupplier: user.role === "supplier",
        },
      });
    } catch {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  // ── Logout ─────────────────────────────────────────────────────────────────
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie("app_session_id", { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });

  app.get("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie("app_session_id", { ...cookieOptions, maxAge: -1 });
    res.redirect(302, "/");
  });
}
