import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import { getUserByOpenId } from "../db";

export type EasyAuthPrincipal = {
    userId: string;
    email?: string | null;
    role?: string | null;
    tenantId?: string | null;
    rawRoles?: string[];
};

export function getRequestAuth(req: Request): EasyAuthPrincipal | null {
    const requestWithAuth = req as Request & { auth?: EasyAuthPrincipal | null };
    if (requestWithAuth.auth) return requestWithAuth.auth;

    const clientPrincipal = req.headers["x-ms-client-principal"];
    if (typeof clientPrincipal !== "string" || !clientPrincipal) return null;

    const expectedTenantId = process.env.AAD_TENANT_ID;
    const expectedClientId = process.env.AAD_CLIENT_ID;
    if (!expectedTenantId || !expectedClientId) return null;

    try {
        const decoded = JSON.parse(Buffer.from(clientPrincipal, "base64").toString("utf-8")) as {
            claims?: Array<{ typ?: string; val?: string }>;
            userDetails?: string;
            userRoles?: string[];
            identityProvider?: string;
        };

        const claims = decoded.claims ?? [];
        const tenantId = claims.find((claim) => claim.typ === "tid")?.val;
        const audience = claims.find((claim) => claim.typ === "aud")?.val || claims.find((claim) => claim.typ === "appid")?.val;
        const userId =
            claims.find((claim) => claim.typ === "oid")?.val ||
            claims.find((claim) => claim.typ === "http://schemas.microsoft.com/identity/claims/objectidentifier")?.val ||
            claims.find((claim) => claim.typ === "sub")?.val;

        if (!tenantId || tenantId !== expectedTenantId) return null;
        if (!audience || audience !== expectedClientId) return null;
        if (!userId) return null;

        const rawRoles = decoded.userRoles ?? [];
        let role: EasyAuthPrincipal["role"] = "user";
        if (rawRoles.includes("admin")) role = "admin";
        else if (rawRoles.includes("architect")) role = "architect";
        else if (rawRoles.includes("supplier")) role = "supplier";

        return {
            userId,
            email: decoded.userDetails ?? null,
            role,
            tenantId,
            rawRoles,
        };
    } catch {
        return null;
    }
}

export async function requireEasyAuthUser(req: Request): Promise<User | null> {
    const auth = getRequestAuth(req);
    if (!auth) return null;

    const user = await getUserByOpenId(String(auth.userId)).catch(() => null);
    return user ?? null;
}