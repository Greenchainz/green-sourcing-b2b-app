import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

/**
 * Build the tRPC context for every request.
 *
 * Auth strategy: Azure Easy Auth (sidecar).
 * The easyAuthMiddleware (registered in index.ts before tRPC) parses the
 * individual X-MS-CLIENT-PRINCIPAL-ID/IDP/NAME headers and attaches them
 * to req.easyAuthPrincipal. We read that here to resolve the database user.
 *
 * The base64 X-MS-CLIENT-PRINCIPAL header uses "auth_typ" (not
 * "identityProvider"), so the individual headers are the authoritative source.
 */
export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const principal = (opts.req as any).easyAuthPrincipal;

    // easyAuthMiddleware guarantees userId and identityProvider are set
    // from the individual X-MS-CLIENT-PRINCIPAL-ID/IDP headers when present.
    if (principal?.userId && principal?.identityProvider &&
        principal.userId !== "undefined" && principal.identityProvider !== "undefined") {

      const providerMap: Record<string, string> = {
        aad: "microsoft",
        google: "google",
        linkedin: "linkedin",
      };
      const prefix = providerMap[principal.identityProvider] ?? principal.identityProvider;
      const openId = `${prefix}:${principal.userId}`;

      // Upsert so the user always exists in the DB after login
      await db.upsertUser({
        openId,
        email: principal.userDetails ?? "",
        name: principal.userDetails ?? "",
        loginMethod: prefix,
        lastSignedIn: new Date(),
      }).catch((err: unknown) => {
        console.warn("[tRPC ctx] upsertUser failed:", err);
      });

      user = await db.getUserByOpenId(openId);
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
