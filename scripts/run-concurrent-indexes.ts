/**
 * run-concurrent-indexes.ts
 *
 * Applies drizzle/migrations/0004_concurrent_indexes.sql outside any transaction.
 * CREATE INDEX CONCURRENTLY is forbidden inside a transaction block in PostgreSQL,
 * so this runner issues each statement individually with autocommit (no BEGIN/COMMIT).
 *
 * Usage:  pnpm db:indexes
 *
 * Safe to re-run: every statement uses IF NOT EXISTS.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SQL_FILE = path.join(
  __dirname,
  "../drizzle/migrations/0004_concurrent_indexes.sql"
);

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL is not set");
    process.exit(1);
  }

  const raw = fs.readFileSync(SQL_FILE, "utf8");

  // Strip comment lines and blank lines; split on semicolons.
  const statements = raw
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--") && line.trim() !== "")
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(
    `[db:indexes] ${statements.length} CREATE INDEX CONCURRENTLY statements to apply`
  );

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  // Each statement runs in autocommit mode (no BEGIN/COMMIT) — required for CONCURRENTLY.
  let applied = 0;
  let skipped = 0;

  for (const stmt of statements) {
    const indexName = stmt.match(/"(idx_[^"]+)"/)?.[1] ?? stmt.slice(0, 60);
    try {
      await client.query(stmt);
      applied++;
      console.log(`  ✅ ${indexName}`);
    } catch (err: unknown) {
      // "already exists" is expected on re-runs (IF NOT EXISTS handles most cases,
      // but CONCURRENTLY on a pre-existing index name raises a different error path
      // in some PG versions).
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already exists")) {
        skipped++;
        console.log(`  ⏭  ${indexName} (already exists)`);
      } else {
        await client.end();
        console.error(`  ❌ Failed on: ${indexName}`);
        console.error(`     ${msg}`);
        process.exit(1);
      }
    }
  }

  await client.end();
  console.log(
    `[db:indexes] Done — applied: ${applied}, skipped: ${skipped}`
  );
}

main().catch((err) => {
  console.error("[db:indexes] Fatal:", err);
  process.exit(1);
});