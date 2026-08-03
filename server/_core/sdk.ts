import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import crypto from "crypto";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

// Utility function
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

class SDKServer {
  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getSessionSecret() {
    const secret = ENV.cookieSecret;
    if (!secret) {
      throw new Error("[Auth] JWT_SECRET is not set - refusing to sign/verify sessions with an empty key");
    }
    return new TextEncoder().encode(secret);
  }

  /**
   * Create a signed JWT session token for a user's openId.
   */
  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || "",
      },
      options
    );
  }

  /**
   * Create a short-lived Forma extension token carrying ext:'forma'.
   * Expires in 5 minutes. Distinct from the session cookie — only valid
   * for /api/public/* Forma extension endpoints.
   */
  async createFormaExtensionToken(openId: string, name: string): Promise<string> {
    const FORMA_TOKEN_TTL_MS = 5 * 60 * 1000;
    const expirationSeconds = Math.floor((Date.now() + FORMA_TOKEN_TTL_MS) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({ openId, appId: ENV.appId, name, ext: "forma" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  /**
   * Verify a Forma extension token. Returns the openId if valid and the token
   * carries ext:'forma'; returns null otherwise.
   */
  async verifyFormaToken(token: string): Promise<string | null> {
    if (!token) return null;
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
      const { openId, ext } = payload as Record<string, unknown>;
      if (typeof openId !== "string" || !openId) return null;
      if (ext !== "forma") return null;
      return openId;
    } catch {
      return null;
    }
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setJti(crypto.randomUUID())
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<{ openId: string; appId: string; name: string } | null> {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { openId, appId, name, jti } = payload as Record<string, unknown>;

      // Only openId is required - appId (VITE_APP_ID) is a build-time var that
      // is empty at runtime in Container Apps, so we cannot require it here.
      if (!isNonEmptyString(openId)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }

      // Reject revoked tokens (e.g. after logout) so a stale cookie on any
      // production replica cannot authenticate requests.
      if (typeof jti === "string" && jti && await db.isJtiRevoked(jti)) {
        console.warn("[Auth] Session token has been revoked");
        return null;
      }

      return { openId, appId: typeof appId === "string" ? appId : "", name: typeof name === "string" ? name : "" };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }

  /**
   * Revoke the session token present in the current request.
   * The revocation is persisted in the shared database so every backend
   * replica consistently rejects the token — not just the one that handled
   * the logout request.
   */
  async revokeRequestSession(req: Request): Promise<void> {
    const cookies = this.parseCookies(req.headers.cookie);
    const cookieValue = cookies.get(COOKIE_NAME);
    if (!cookieValue) return;

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { jti, exp } = payload as Record<string, unknown>;
      if (typeof jti !== "string" || !jti) return;

      const expiresAt = new Date(typeof exp === "number" ? exp * 1000 : Date.now() + ONE_YEAR_MS);
      await db.insertRevokedJti(jti, expiresAt);
    } catch {
      // Invalid or already-expired token — nothing to revoke.
    }
  }

  /**
   * Authenticate an Express request via the app_session_id JWT cookie.
   * Throws ForbiddenError if the session is invalid or user is not in DB.
   */
  async authenticateRequest(req: Request): Promise<User> {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);

    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }

    const user = await db.getUserByOpenId(session.openId);

    if (!user) {
      throw ForbiddenError("User not found");
    }

    const now = new Date();

    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: now,
    });

    return user;
  }
}

export const sdk = new SDKServer();
