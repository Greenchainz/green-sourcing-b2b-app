import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  /** DB-mapped user resolved from the authenticated session cookie. */
  user: User | null;
  /** Session-auth metadata derived from the authenticated cookie. */
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
 * Priority: prefer the signed session cookie. When present we authenticate it
 * and attach the DB user to context.
 */
export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  try {
    const user = await sdk.authenticateRequest(opts.req);
    return {
      req: opts.req,
      res: opts.res,
      user,
      auth: {
        userId: String(user.openId),
        email: user.email ?? null,
        role: user.role ?? null,
        tenantId: null,
        rawRoles: [user.role],
      },
    };
  } catch (err) {
    // Log unexpected errors (not just "missing cookie") to help debug auth issues.
    // Only log at warn level when a cookie WAS present but auth still failed —
    // that indicates a real problem (expired JWT, DB failure, etc.).
    const hasCookie = opts.req.headers.cookie?.includes("app_session_id");
    if (hasCookie) {
      console.warn("[tRPC Context] Auth failed despite cookie present:", String(err));
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user: null,
    auth: null,
  };
}
