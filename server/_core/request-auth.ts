/**
 * requireEasyAuthUser — delegates to the canonical JWT session cookie auth.
 *
 * Previously attempted to parse Azure Easy Auth x-ms-client-principal headers,
 * but Easy Auth is explicitly NOT enabled on this Container App (see AUTH_GUARDRAILS.md).
 * That caused every route using this helper to permanently return 401.
 *
 * Now uses sdk.authenticateRequest() — the same JWT cookie path used by tRPC
 * protectedProcedure — so uploads, PDFs, admin routes, and spec sheets work correctly.
 */
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export async function requireEasyAuthUser(req: Request): Promise<User | null> {
    try {
        return await sdk.authenticateRequest(req);
    } catch {
        return null;
    }
}