/**
 * Seed load-test users into the database.
 *
 * Creates one buyer and one supplier account with known credentials
 * that the k6 scripts use. Safe to run multiple times (upserts).
 *
 * Usage:
 *   pnpm tsx tests/load/seed-test-users.ts
 *
 * Requires DATABASE_URL in environment (.env.local or exported).
 */

import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });

import { scrypt, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import { Pool } from "pg";

const scryptAsync = promisify(scrypt);

const LOAD_TEST_USERS = [
  {
    email: process.env.BUYER_EMAIL    ?? "loadtest-buyer@greenchainz.com",
    password: process.env.BUYER_PASSWORD ?? "LoadTest123!",
    name: "Load Test Buyer",
    role: "buyer" as const,
    openId: "loadtest-buyer-openid",
  },
  {
    email: process.env.SUP_EMAIL      ?? "loadtest-supplier@greenchainz.com",
    password: process.env.SUP_PASSWORD   ?? "LoadTest123!",
    name: "Load Test Supplier",
    role: "supplier" as const,
    openId: "loadtest-supplier-openid",
  },
];

async function hashPassword(password: string): Promise<{ hash: Buffer; salt: Buffer }> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64) as Buffer;
  return { hash, salt };
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log("🌱 Seeding load-test users...\n");

  for (const user of LOAD_TEST_USERS) {
    const { hash, salt } = await hashPassword(user.password);

    // Upsert user record
    const userResult = await pool.query<{ id: number }>(
      `INSERT INTO users (openId, email, name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (openId) DO UPDATE
         SET email = EXCLUDED.email,
             name  = EXCLUDED.name,
             role  = EXCLUDED.role
       RETURNING id`,
      [user.openId, user.email, user.name, user.role]
    );
    const userId = userResult.rows[0].id;

    // Upsert email_credentials (same schema as email-auth.ts)
    await pool.query(
      `INSERT INTO email_credentials (user_id, email, hash, salt)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE
         SET hash = EXCLUDED.hash,
             salt = EXCLUDED.salt`,
      [userId, user.email, hash, salt]
    );

    // If supplier, ensure a supplier profile exists
    if (user.role === "supplier") {
      await pool.query(
        `INSERT INTO suppliers (user_id, company_name, contact_name, contact_email, status)
         VALUES ($1, $2, $3, $4, 'active')
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, "Load Test Supply Co.", user.name, user.email]
      );
    }

    console.log(`✅  ${user.role.padEnd(8)} ${user.email} (user_id=${userId})`);
  }

  await pool.end();
  console.log("\n✅ Done. Load-test users are ready.");
  console.log(
    "\nCredentials:\n" +
    LOAD_TEST_USERS.map((u) => `  ${u.role}: ${u.email} / ${u.password}`).join("\n")
  );
}

main().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
