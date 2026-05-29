import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getUserByOpenId } from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  /**
   * DB-mapped user when available. This should be populated from Easy Auth
   * (`req.auth`) when present. Kept for compatibility with existing code.
   */
  user: User | null;
  /**
   * The Easy Auth payload injected by the Azure Easy Auth middleware
   * (middleware/parseAuth.js). When present this is the canonical identity
   * source for incoming requests.
   */
  auth?: {
    userId: string;
    email?: string | null;
    role?: string | null;
    tenantId?: string | null;
    rawRoles?: string[];
  } | null;
};

/**
 * Build the tRPC context for every request.
 *
 * Priority: prefer Easy Auth (`req.auth`) when present. When `req.auth` is
 * available we attempt to map it to a DB user via `getUserByOpenId` and set
 * `ctx.user` accordingly. When Easy Auth is not present (local dev/test), we
 * fall back to the legacy `sdk.authenticateRequest` cookie-based session so
 * developer workflows and tests continue to work.
 */
export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const req = opts.req as any;

  // Prefer Easy Auth payload if the parseAuth middleware ran earlier.
  const reqAuth = req?.auth ?? null;

  if (reqAuth) {
    // Try to map Easy Auth identity to a DB user record.
    try {
      const user = await getUserByOpenId(String(reqAuth.userId)).catch(() => null);
      return {
        req: opts.req,
        res: opts.res,
        user: user ?? null,
        auth: {
          userId: String(reqAuth.userId),
          email: reqAuth.email ?? null,
          role: reqAuth.role ?? null,
          tenantId: reqAuth.tenantId ?? null,
          rawRoles: reqAuth.rawRoles ?? [],
        },
      };
    } catch (err) {
      return {
        req: opts.req,
        res: opts.res,
        user: null,
        auth: {
          userId: String(reqAuth.userId),
          email: reqAuth.email ?? null,
          role: reqAuth.role ?? null,
          tenantId: reqAuth.tenantId ?? null,
          rawRoles: reqAuth.rawRoles ?? [],
        },
      };
    }
  }

  // Fallback: legacy cookie-based session (kept for local development/tests).
  let user: User | null = null;
  try {
    user = await sdk.authenticateRequest(opts.req).catch(() => null);
  } catch {
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    auth: null,
  };
}
