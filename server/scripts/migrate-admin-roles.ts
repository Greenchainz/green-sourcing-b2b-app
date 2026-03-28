/**
 * One-time migration: write explicit role='admin' for all @greenchainz.com users.
 *
 * After running this against production, remove the @greenchainz.com email-suffix
 * fallback from server/_core/easy-auth.ts (marked with a TODO comment) so that
 * future admin grants require a deliberate DB update rather than just a mailbox.
 *
 * Usage:
 *   npx tsx server/scripts/migrate-admin-roles.ts
 *
 * Safe to run multiple times — onConflictDoUpdate is idempotent.
 */

import "dotenv/config";
import { existsSync } from "fs";
import { config } from "dotenv";

if (existsSync(".env.local")) {
  config({ path: ".env.local", override: true });
}

import { eq, like, and, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { users } from "../../drizzle/schema";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("azure") || databaseUrl.includes("postgres.database.azure.com")
      ? { rejectUnauthorized: false }
      : false,
  });
  const db = drizzle(pool);

  // Find all @greenchainz.com users that do not already have the admin role
  const targets = await db
    .select({ id: users.id, openId: users.openId, email: users.email, role: users.role })
    .from(users)
    .where(
      and(
        like(users.email, "%@greenchainz.com"),
        ne(users.role, "admin")
      )
    );

  if (targets.length === 0) {
    console.log("[migrate-admin-roles] No @greenchainz.com users found without admin role. Nothing to do.");
    await pool.end();
    return;
  }

  console.log(`[migrate-admin-roles] Promoting ${targets.length} user(s) to admin:`);
  for (const u of targets) {
    console.log(`  id=${u.id}  openId=${u.openId}  email=${u.email}  current_role=${u.role}`);
  }

  for (const u of targets) {
    await db
      .update(users)
      .set({ role: "admin", updatedAt: new Date() })
      .where(eq(users.id, u.id));
  }

  console.log("[migrate-admin-roles] Done. You may now remove the @greenchainz.com fallback in easy-auth.ts.");
  await pool.end();
}

main().catch((err) => {
  console.error("[migrate-admin-roles] Fatal error:", err);
  process.exit(1);
});
