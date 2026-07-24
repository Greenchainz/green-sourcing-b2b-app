import type { User } from "../../drizzle/schema";

export const FOUNDER_ADMIN_EMAIL = "founder@greenchainz.com";

function normalizeEmail(email: string | null | undefined): string {
  return String(email ?? "").trim().toLowerCase();
}

export function isFounderAdminEmail(email: string | null | undefined): boolean {
  return normalizeEmail(email) === FOUNDER_ADMIN_EMAIL;
}

export function canAccessAdmin(
  user: Pick<User, "role" | "email"> | null | undefined,
): boolean {
  return Boolean(user && user.role === "admin" && isFounderAdminEmail(user.email));
}
