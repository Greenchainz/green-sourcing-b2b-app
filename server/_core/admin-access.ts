import type { User } from "../../drizzle/schema";

export function canAccessAdmin(
  user: Pick<User, "role" | "email"> | null | undefined,
): boolean {
  return Boolean(user && user.role === "admin");
}
