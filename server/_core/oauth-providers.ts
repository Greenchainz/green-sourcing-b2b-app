/**
 * OAuth Provider Routes - Microsoft Entra ID only
 * OAuth Provider Routes - Microsoft Entra ID, LinkedIn
 *
 * Replaces the Manus OAuth flow with direct provider OAuth 2.0.
 * Session is stored as a signed JWT cookie.
 *
 * Flow:
 *   1. GET /api/auth/:provider -> redirect to provider
 *   2. GET /api/auth/callback/:provider -> exchange code, upsert user, set cookie
 *   3. GET /api/auth/me -> return current user from session
 *   4. POST /api/auth/logout -> clear session cookie
 */

import crypto from "crypto";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions, hostOnlyCookieOptions, issueSessionCookies } from "./cookies";
import { sdk } from "./sdk";
import { ONE_YEAR_MS } from "@shared/const";
import { getEnvWithDevDefault, getRequiredEnv } from "./oauth-env";

// Helpers

function buildRedirectUri(_req: Request, provider: string): string {
  // Always use the canonical production domain to avoid Container Apps internal domain mismatch
  const baseUrl = process.env.APP_BASE_URL || "https://greenchainz.com";
  return `${baseUrl}/api/auth/callback/${provider}`;
}

function getForwardedHostContext(req: Request): {
  host: string | null;
  proto: string | null;
} {
  const rawForwardedHost = req.headers["x-forwarded-host"];
  const rawForwardedProto = req.headers["x-forwarded-proto"];
  const forwardedHost = Array.isArray(rawForwardedHost)
    ? rawForwardedHost[0]
    : typeof rawForwardedHost === "string"
      ? rawForwardedHost.split(",")[0]?.trim() ?? ""
      : "";
  const forwardedProto = Array.isArray(rawForwardedProto)
    ? rawForwardedProto[0]
    : typeof rawForwardedProto === "string"
      ? rawForwardedProto.split(",")[0]?.trim() ?? ""
      : "";
  const safeHost = /^[a-z0-9.-]+(?::\d+)?$/i.test(forwardedHost) ? forwardedHost.toLowerCase() : null;
  const safeProto = /^[a-z]+$/i.test(forwardedProto) ? forwardedProto.toLowerCase() : null;
  return { host: safeHost, proto: safeProto };
}

async function clearSessionCookies(req: Request, res: Response): Promise<void> {
  const scopedOptions = getSessionCookieOptions(req);
  res.clearCookie("app_session_id", { ...scopedOptions, maxAge: -1 });
  // Clear legacy host-only cookies to avoid duplicate-name shadowing.
  res.clearCookie("app_session_id", { ...hostOnlyCookieOptions(req), maxAge: -1 });
  // Revoke the JWT server-side so a stale host-only cookie on the other
  // production host cannot authenticate requests after logout.
  await sdk.revokeRequestSession(req);
}

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

// Trusted external origins that may receive a short-lived auth code via returnPath redirect.
// After OAuth completes the user is redirected to the returnPath with ?code=<uuid>.
// The Forma extension exchanges that code at GET /api/auth/forma-token for a
// short-lived JWT carrying ext:'forma', which it can then use against /api/public/*.
const ALLOWED_EXTERNAL_ORIGINS: readonly string[] = [
  "https://forma.greenchainz.com",
];

// Single-use auth-code store for the Forma extension token-exchange flow.
// code → { openId, name, expiresAt }  (expires in 5 min; deleted on first use)
const FORMA_CODE_TTL_MS = 5 * 60 * 1000;
const formaAuthCodes = new Map<string, { openId: string; name: string; expiresAt: number }>();

function pruneFormaAuthCodes(): void {
  const now = Date.now();
  for (const [code, entry] of formaAuthCodes) {
    if (entry.expiresAt < now) formaAuthCodes.delete(code);
  }
}

function isAllowedReturnPath(raw: string): boolean {
  if (typeof raw !== "string" || !raw) return false;
  if (/^\/(?!\/)/.test(raw)) return true; // relative path on same origin
  // Use string-prefix matching to avoid potential URL-parser quirks in the deployed env.
  // An absolute returnPath is allowed when it starts with an allowlisted origin.
  const allowed = ALLOWED_EXTERNAL_ORIGINS.some(
    (origin) => raw === origin || raw.startsWith(origin + "/")
  );
  return allowed;
}

type OAuthRole = "supplier" | "buyer" | null;

interface OAuthStatePayload {
  returnPath: string;
  role: OAuthRole;
  createdAt: number;
  nonce: string;
}

function getOAuthStateSecret(): string {
  const secret = process.env.OAUTH_STATE_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("OAUTH_STATE_SECRET or JWT_SECRET must be set in production");
    }
    return "dev-oauth-state-secret";
  }
  return secret;
}

function signStatePayload(payloadB64: string): string {
  return crypto
    .createHmac("sha256", getOAuthStateSecret())
    .update(payloadB64)
    .digest("base64url");
}

function createState(returnPath: string, role: OAuthRole): string {
  const payload: OAuthStatePayload = {
    returnPath,
    role,
    createdAt: Date.now(),
    nonce: crypto.randomBytes(12).toString("hex"),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signStatePayload(payloadB64);
  return `${payloadB64}.${signature}`;
}

function consumeState(state: string): { returnPath: string; role: OAuthRole } | null {
  const [payloadB64, providedSig] = state.split(".");
  if (!payloadB64 || !providedSig) {
    return null;
  }

  const expectedSig = signStatePayload(payloadB64);
  const providedBuffer = Buffer.from(providedSig, "utf8");
  const expectedBuffer = Buffer.from(expectedSig, "utf8");

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as OAuthStatePayload;
    if (Date.now() - payload.createdAt > OAUTH_STATE_TTL_MS) {
      return null;
    }

    const safeReturnPath = isAllowedReturnPath(payload.returnPath) ? payload.returnPath : "/";
    const safeRole: OAuthRole = payload.role === "supplier" || payload.role === "buyer" ? payload.role : null;
    return { returnPath: safeReturnPath, role: safeRole };
  } catch {
    return null;
  }
}

// Provider configs

// Public Entra app registration for GreenChainz user sign-in (OAuth2/OIDC).
// These are NOT secrets — they are the same public identifiers baked into the
// frontend container and documented in .env.example. Only the client *secret*
// is sensitive (see getRequiredEnv("AZURE_AD_CLIENT_SECRET")). In production,
// AZURE_AD_TENANT_ID and AZURE_AD_CLIENT_ID must be set; if missing the initiate
// route redirects to /login?error=oauth_config_missing rather than returning 500.
const MICROSOFT_TENANT_ID = "1d04bf50-8175-40af-a9d5-f8e441460b06";
const MICROSOFT_CLIENT_ID = "8b597068-9347-4e99-8860-8c4e9a9bc112";

function firstNonEmptyEnv(...keys: string[]): string | null {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function isStrictOAuthConfigEnv(): boolean {
  return process.env.NODE_ENV === "production";
}

function getMicrosoftTenantId(): string {
  const value = firstNonEmptyEnv("AZURE_AD_TENANT_ID", "MICROSOFT_TENANT_ID");
  if (value) return value;
  if (isStrictOAuthConfigEnv()) {
    throw new Error(
      "Missing Microsoft OAuth config: set AZURE_AD_TENANT_ID or MICROSOFT_TENANT_ID in production"
    );
  }
  return MICROSOFT_TENANT_ID;
}

function getMicrosoftClientId(): string {
  const value = firstNonEmptyEnv("AZURE_AD_CLIENT_ID", "MICROSOFT_CLIENT_ID");
  if (value) return value;
  if (isStrictOAuthConfigEnv()) {
    throw new Error(
      "Missing Microsoft OAuth config: set AZURE_AD_CLIENT_ID or MICROSOFT_CLIENT_ID in production"
    );
  }
  return MICROSOFT_CLIENT_ID;
}

function getMicrosoftClientSecret(): string {
  const secret = firstNonEmptyEnv("AZURE_AD_CLIENT_SECRET", "MICROSOFT_CLIENT_SECRET");
  if (!secret) {
    throw new Error(
      "Missing Microsoft OAuth config: set AZURE_AD_CLIENT_SECRET or MICROSOFT_CLIENT_SECRET"
    );
  }
  return secret;
}

function mapCallbackError(error: unknown, provider?: string): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();
  if (normalized.includes("aadsts50011")) {
    return "redirect_mismatch";
  }
  if (normalized.includes("invalid_grant")) {
    // Use a provider-neutral key so LinkedIn errors are not labelled with
    // Microsoft-specific messaging on the login page.
    return provider === "microsoft" ? "invalid_grant" : "token_exchange_failed";
  }
  if (
    normalized.includes("missing microsoft oauth config") ||
    normalized.includes("azure_ad_client_secret") ||
    normalized.includes("microsoft_client_secret")
  ) {
    return "oauth_config_missing";
  }
  return "callback_failed";
}

function getMicrosoftAuthUrl(redirectUri: string, state: string): string {
  const tenantId = getMicrosoftTenantId();
  const clientId = getMicrosoftClientId();
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

function getLinkedInAuthUrl(redirectUri: string, state: string): string {
  const clientId = getEnvWithDevDefault("LINKEDIN_CLIENT_ID", "77lzd3h7nzedke");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: "openid profile email",
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
}

// Token exchange

interface OAuthUserInfo {
  openId: string;
  email: string | null;
  name: string | null;
  provider: string;
}

async function exchangeMicrosoftCode(code: string, redirectUri: string): Promise<OAuthUserInfo> {
  const tenantId = getMicrosoftTenantId();
  const clientId = getMicrosoftClientId();
  const clientSecret = getMicrosoftClientSecret();

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

async function exchangeLinkedInCode(code: string, redirectUri: string): Promise<OAuthUserInfo> {
  const clientId = getEnvWithDevDefault("LINKEDIN_CLIENT_ID", "77lzd3h7nzedke");
  const clientSecret = getRequiredEnv("LINKEDIN_CLIENT_SECRET");

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

// Route registration

export function registerOAuthProviderRoutes(app: Express) {
  // Current user route must register before /:provider wildcard
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(200).json({ authenticated: false, user: null });
        return;
      }
      res.status(200).json({
        authenticated: true,
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
      res.status(200).json({ authenticated: false, user: null });
    }
  });

  // Logout route must register before /:provider wildcard
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    await clearSessionCookies(req, res);
    res.json({ success: true });
  });

  app.get("/api/auth/logout", async (req: Request, res: Response) => {
    await clearSessionCookies(req, res);
    res.redirect(302, "/");
  });

  // Initiate OAuth flow
  app.get("/api/auth/:provider", (req: Request, res: Response) => {
    const provider = Array.isArray(req.params.provider) ? req.params.provider[0] : req.params.provider;
    const rawReturnPath = (req.query.returnPath as string) || "/";
    const returnPath = isAllowedReturnPath(rawReturnPath) ? rawReturnPath : "/";
    const requestedRole = (req.query.role as string) || null;
    const role: OAuthRole = requestedRole === "supplier" || requestedRole === "buyer" ? requestedRole : null;

    const state = createState(returnPath, role);
    const redirectUri = buildRedirectUri(req, provider);

    let authUrl: string;
    try {
      switch (provider) {
        case "microsoft":
          authUrl = getMicrosoftAuthUrl(redirectUri, state);
          break;
        case "linkedin":
          authUrl = getLinkedInAuthUrl(redirectUri, state);
          break;
        default:
          res.status(400).json({ error: `Unknown provider: ${provider}` });
          return;
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err ?? "");
      const isConfigError = errMsg.toLowerCase().includes("missing microsoft oauth config");
      if (isConfigError) {
        console.error("[Auth] OAuth configuration missing, cannot initiate flow:", errMsg);
        res.redirect(302, "/login?error=oauth_config_missing");
      } else {
        console.error("[Auth] Failed to build auth URL:", err);
        res.redirect(302, "/login?error=callback_failed");
      }
      return;
    }

    res.redirect(302, authUrl);
  });

  // OAuth callback
  app.get("/api/auth/callback/:provider", async (req: Request, res: Response) => {
    const provider = Array.isArray(req.params.provider) ? req.params.provider[0] : req.params.provider;
    const code = req.query.code as string;
    const state = req.query.state as string;
    const error = req.query.error as string;

    if (error) {
      const { host, proto } = getForwardedHostContext(req);
      console.error(`[Auth] Provider error from ${provider}:`, {
        error,
        errorDescription: req.query.error_description,
        requestHost: req.headers.host ?? null,
        forwardedHost: host,
        forwardedProto: proto,
      });
      res.redirect(302, `/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (!code || !state) {
      res.redirect(302, "/login?error=missing_code");
      return;
    }

    const stateData = consumeState(state);
    if (!stateData) {
      res.redirect(302, "/login?error=invalid_state");
      return;
    }
    const { returnPath, role } = stateData;
    const redirectUri = buildRedirectUri(req, provider);

    try {
      let userInfo: OAuthUserInfo;
      switch (provider) {
        case "microsoft":
          userInfo = await exchangeMicrosoftCode(code, redirectUri);
          break;
        case "linkedin":
          userInfo = await exchangeLinkedInCode(code, redirectUri);
          break;
        default:
          res.redirect(302, "/login?error=unknown_provider");
          return;
      }

      // Determine role.
      let assignedRole: "buyer" | "supplier" | "admin" | "user" = "buyer";
      if (role === "supplier") {
        assignedRole = "supplier";
      } else if (role === "buyer") {
        assignedRole = "buyer";
      }

      // Check if this is a new user before upserting.
      const existingUser = await db.getUserByOpenIdIncludingDeleted(userInfo.openId);
      if (existingUser?.deletedAt) {
        res.redirect(302, `/login?error=${encodeURIComponent("This account has been deactivated. Contact support.")}`);
        return;
      }
      const isNewUser = !existingUser;

      // Preserve existing role.
      let roleForUpsert: "buyer" | "supplier" | "admin" | "user" | undefined = assignedRole;
      if (existingUser?.role) {
        roleForUpsert = undefined;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name,
        email: userInfo.email,
        loginMethod: userInfo.provider,
        lastSignedIn: new Date(),
        role: roleForUpsert,
      });

      const effectiveRole = roleForUpsert ?? existingUser?.role ?? assignedRole;

      // Send welcome email to new users (non-blocking)
      if (isNewUser && userInfo.email) {
        import("../notification-service").then(({ sendWelcomeEmail }) => {
          sendWelcomeEmail({
            name: userInfo.name ?? "there",
            email: userInfo.email!,
            role: effectiveRole,
          }).catch((err: unknown) => console.warn("[Auth] Welcome email failed (non-critical):", err));
        }).catch(() => { });
      }

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name ?? "",
        expiresInMs: ONE_YEAR_MS,
      });

      // Use the shared helper to set both domain-scoped and host-only cookies
      // so all auth flows stay in sync during the migration period.
      issueSessionCookies(req, res, "app_session_id", sessionToken, ONE_YEAR_MS);

      // For external allowlisted origins (e.g. the Forma extension auth-callback page),
      // issue a short-lived single-use code instead of embedding the session JWT in the
      // URL (which would expose a 1-year bearer token to logs and browser history).
      // The Forma extension exchanges the code at GET /api/auth/forma-token for a
      // short-lived JWT with ext:'forma' that can authenticate /api/public/* calls.
      let finalRedirect = returnPath || "/";
      try {
        const u = new URL(finalRedirect);
        if (ALLOWED_EXTERNAL_ORIGINS.includes(u.origin)) {
          pruneFormaAuthCodes();
          const code = crypto.randomUUID();
          formaAuthCodes.set(code, {
            openId: userInfo.openId,
            name: userInfo.name ?? "",
            expiresAt: Date.now() + FORMA_CODE_TTL_MS,
          });
          u.searchParams.set("code", code);
          finalRedirect = u.toString();
        }
      } catch {
        // relative path — no external code needed
      }
      res.redirect(302, finalRedirect);
    } catch (err) {
      const { host, proto } = getForwardedHostContext(req);
      console.error(`[Auth] Callback failed for ${provider}:`, {
        error: err instanceof Error ? err.message : String(err ?? ""),
        stack: err instanceof Error ? err.stack : undefined,
        requestHost: req.headers.host ?? null,
        forwardedHost: host,
        forwardedProto: proto,
      });
      const mappedError = mapCallbackError(err, provider);
      res.redirect(302, `/login?error=${encodeURIComponent(mappedError)}`);
    }
  });

  // ── GET /api/auth/forma-token?code=<uuid> ────────────────────────────────
  // Exchanges a single-use short-lived auth code (issued during the OAuth
  // callback redirect to an allowlisted external origin) for a Forma extension
  // JWT carrying ext:'forma'. The extension uses that token as a Bearer token
  // against /api/public/* endpoints.
  app.get("/api/auth/forma-token", async (req: Request, res: Response) => {
    const code = typeof req.query.code === "string" ? req.query.code.trim() : null;
    if (!code) return res.status(400).json({ error: "Missing code" });

    const entry = formaAuthCodes.get(code);
    formaAuthCodes.delete(code); // single-use regardless of outcome

    if (!entry || Date.now() > entry.expiresAt) {
      return res.status(401).json({ error: "Invalid or expired code" });
    }

    const token = await sdk.createFormaExtensionToken(entry.openId, entry.name);
    return res.json({ token });
  });

}
