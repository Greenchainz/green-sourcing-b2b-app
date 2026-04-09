import type { Request, Response } from "express";
import type { User } from "../../drizzle/schema";

export type RouteUser = Pick<User, "id" | "role"> & Record<string, unknown>;

export type AuthenticateRequest = (req: Request) => Promise<RouteUser>;

export async function requireAdminUser(
    req: Request,
    res: Response,
    authenticateRequest: AuthenticateRequest
): Promise<RouteUser | null> {
    const user = await authenticateRequest(req).catch(() => null);
    if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return null;
    }

    if (user.role !== "admin") {
        res.status(403).json({ error: "Forbidden" });
        return null;
    }

    return user;
}

export function canAccessRfqPdf(
    user: Pick<User, "id" | "role">,
    rfqOwnerUserId: number
): boolean {
    return user.role === "admin" || user.id === rfqOwnerUserId;
}
