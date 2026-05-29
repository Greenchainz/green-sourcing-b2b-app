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
  } catch {
    // Unauthenticated requests are expected on public routes.
  }

  return {
    req: opts.req,
    res: opts.res,
    user: null,
    auth: null,
  };
}
