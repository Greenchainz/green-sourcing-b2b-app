/**
 * Email/Password Authentication
 *
 * Additive auth path for users who don't (or can't) use an OAuth provider.
 * This app uses custom Express OAuth routes + JWT session cookies (no Azure Easy Auth sidecar).
 *
 * Stores credentials in a separate `email_credentials` table:
 *   - Password is hashed with scrypt (Node built-in, no extra deps)
 *   - Session is issued as the same app_session_id JWT used by the OAuth flows
 *
 * Routes:
 *   POST /api/auth/email/signup  - create account + issue session cookie
 *   POST /api/auth/email/login   - verify password + issue session cookie
 */

import type { Express, Request, Response } from "express";
import { scrypt, timingSafeEqual, randomBytes } from "crypto";
import { promisify } from "util";
import { Pool } from "pg";
import * as db from "../db";
import { sdk } from "./sdk";
import { issueSessionCookies } from "./cookies";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

const scryptAsync = promisify(scrypt);
const SALT_BYTES = 16;
const KEY_LEN = 64;

type RateLimitEntry = { count: number; resetAt: number };
const signupRateLimit = new Map<string, RateLimitEntry>();
const loginRateLimit = new Map<string, RateLimitEntry>();

function getRequestIp(req: Request): string {
  return String(req.ip ?? req.socket.remoteAddress ?? "unknown");
}

function isRateLimited(
  bucket: Map<string, RateLimitEntry>,
  key: string,
  maxRequests: number,
  windowMs: number
): { limited: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = bucket.get(key);
  if (!entry || now >= entry.resetAt) {
    bucket.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, retryAfterSeconds: 0 };
  }

  entry.count += 1;
  if (entry.count > maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return { limited: true, retryAfterSeconds };
  }
  return { limited: false, retryAfterSeconds: 0 };
}

// Lazy pg pool (uses same DATABASE_URL as the rest of the app)

let _pool: Pool | null = null;

function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.DATABASE_URL.includes("azure") ||
          process.env.DATABASE_URL.includes("postgres.database.azure.com")
          ? { rejectUnauthorized: false }
          : false,
    });
  }
  return _pool;
}

// Password helpers

async function hashPassword(password: string): Promise<{ hash: Buffer; salt: Buffer }> {
  const salt = randomBytes(SALT_BYTES);
  const hash = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  return { hash, salt };
}

async function verifyPassword(password: string, salt: Buffer, hash: Buffer): Promise<boolean> {
  const derived = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  return timingSafeEqual(derived, hash);
}

// Table bootstrap

let _tableReady = false;

async function ensureTable(): Promise<void> {
  if (_tableReady) return;
  const pool = getPool();
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_credentials (
      id          SERIAL PRIMARY KEY,
      "userId"    INTEGER NOT NULL,
      email       VARCHAR(320) NOT NULL UNIQUE,
      salt        BYTEA NOT NULL,
      hash        BYTEA NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  _tableReady = true;
  console.log("[EmailAuth] email_credentials table ready");
}

// Helpers

function openIdForEmail(email: string): string {
  // Deterministic openId derived from the normalised email
  const normalized = email.toLowerCase().trim();
  return `email:${Buffer.from(normalized).toString("base64url")}`;
}

function isAllowlistedAdminEmail(email: string): boolean {
  const allowlist = process.env.ADMIN_EMAIL_ALLOWLIST
    ?.split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (!allowlist || allowlist.length === 0) return false;
  return allowlist.includes(email.toLowerCase().trim());
}

function assignRole(email: string, requestedRole?: string): "buyer" | "supplier" | "admin" {
  if (isAllowlistedAdminEmail(email)) return "admin";
  if (requestedRole === "supplier") return "supplier";
  return "buyer";
}

async function issueSession(
  req: Request,
  res: Response,
  openId: string,
  name: string
): Promise<void> {
  const token = await sdk.createSessionToken(openId, { name, expiresInMs: ONE_YEAR_MS });
  // Use the shared helper to set both domain-scoped and host-only cookies so
  // email auth stays in sync with OAuth during the migration period.
  issueSessionCookies(req, res, COOKIE_NAME, token, ONE_YEAR_MS);
}

// Route registration

export function registerEmailAuthRoutes(app: Express): void {
  // Bootstrap table once on startup (non-blocking)
  ensureTable().catch((err) =>
    console.warn("[EmailAuth] Table bootstrap failed (DB may not be available yet):", err)
  );

  // POST /api/auth/email/signup
  app.post("/api/auth/email/signup", async (req: Request, res: Response) => {
    if (process.env.DISABLE_SIGNUP === "true") {
      return void res.status(503).json({ error: "Sign-up is temporarily disabled." });
    }

    const signupLimit = isRateLimited(signupRateLimit, getRequestIp(req), 5, 60_000);
    if (signupLimit.limited) {
      res.setHeader("Retry-After", String(signupLimit.retryAfterSeconds));
      return void res.status(429).json({ error: "Too many signup attempts. Please try again shortly." });
    }

    const { email, password, name, role } = req.body ?? {};

    if (!email || !password) {
      return void res.status(400).json({ error: "Email and password are required." });
    }
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return void res.status(400).json({ error: "Please enter a valid email address." });
    }
    if (typeof password !== "string" || password.length < 8) {
      return void res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    const pool = getPool();
    if (!pool) {
      return void res.status(503).json({ error: "Database unavailable." });
    }

    try {
      // Ensure email_credentials table exists (idempotent)
      await ensureTable();
      // Check for existing account
      const existing = await pool.query(
        `SELECT id FROM email_credentials WHERE email = $1`,
        [email.toLowerCase().trim()]
      );
      if (existing.rows.length > 0) {
        return void res.status(409).json({
          error: "An account with this email already exists. Try signing in instead.",
        });
      }

      const openId = openIdForEmail(email);
      const displayName = (typeof name === "string" && name.trim()) ? name.trim() : email.split("@")[0];
      const assignedRole = assignRole(email, role);

      // Upsert user row
      await db.upsertUser({
        openId,
        email: email.toLowerCase().trim(),
        name: displayName,
        loginMethod: "email",
        lastSignedIn: new Date(),
        role: assignedRole,
      });

      const dbUser = await db.getUserByOpenId(openId);
      if (!dbUser) {
        return void res.status(500).json({ error: "Account creation failed. Please try again." });
      }

      // Store hashed credentials
      const { hash, salt } = await hashPassword(password);
      await pool.query(
        `INSERT INTO email_credentials ("userId", email, salt, hash) VALUES ($1, $2, $3, $4)`,
        [dbUser.id, email.toLowerCase().trim(), salt, hash]
      );

      await issueSession(req, res, openId, displayName);

      res.json({
        success: true,
        redirectTo: assignedRole === "supplier" ? "/supplier/onboarding" : "/rfq-dashboard",
      });
    } catch (err) {
      console.error("[EmailAuth] Signup error:", err);
      res.status(500).json({ error: "Signup failed. Please try again." });
    }
  });

  // POST /api/auth/email/login
  app.post("/api/auth/email/login", async (req: Request, res: Response) => {
    const loginLimit = isRateLimited(loginRateLimit, getRequestIp(req), 10, 60_000);
    if (loginLimit.limited) {
      res.setHeader("Retry-After", String(loginLimit.retryAfterSeconds));
      return void res.status(429).json({ error: "Too many login attempts. Please try again shortly." });
    }

    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return void res.status(400).json({ error: "Email and password are required." });
    }

    const pool = getPool();
    if (!pool) {
      return void res.status(503).json({ error: "Database unavailable." });
    }

    try {
      // Ensure email_credentials table exists (idempotent)
      await ensureTable();

      const result = await pool.query(
        `SELECT ec.salt, ec.hash, ec."userId", u."openId", u.name, u.role, u.deleted_at AS "deletedAt"
           FROM email_credentials ec
           JOIN users u ON u.id = ec."userId"
          WHERE ec.email = $1`,
        [email.toLowerCase().trim()]
      );

      if (result.rows.length === 0) {
        // Constant-time response regardless of whether email exists
        return void res.status(401).json({ error: "Invalid email or password." });
      }

      const row = result.rows[0];
      if (row.deletedAt) {
        return void res.status(403).json({ error: "This account has been deactivated. Contact support." });
      }

      const salt = Buffer.isBuffer(row.salt) ? row.salt : Buffer.from(row.salt);
      const hash = Buffer.isBuffer(row.hash) ? row.hash : Buffer.from(row.hash);

      const valid = await verifyPassword(password, salt, hash);
      if (!valid) {
        return void res.status(401).json({ error: "Invalid email or password." });
      }

      // Refresh lastSignedIn
      await db.upsertUser({
        openId: row.openId,
        loginMethod: "email",
        lastSignedIn: new Date(),
      });

      const displayName = (row.name as string) || email.split("@")[0];
      await issueSession(req, res, row.openId as string, displayName);

      res.json({
        success: true,
        redirectTo: row.role === "supplier" ? "/supplier/dashboard" : "/rfq-dashboard",
      });
    } catch (err) {
      console.error("[EmailAuth] Login error:", err);
      res.status(500).json({ error: "Login failed. Please try again." });
    }
  });
}
