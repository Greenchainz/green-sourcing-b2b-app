/**
 * Seed script: generate pgvector embeddings for materials.
 * Run with: tsx scripts/generate-embeddings.ts
 *
 * Requirements:
 *   - DATABASE_URL env var
 *   - OPENAI_API_KEY env var
 *   - pgvector extension enabled on the database
 *
 * Safe to re-run — only processes materials where embedding IS NULL.
 * Processes in batches of 50 with a pause between batches to respect rate limits.
 */

import { config } from "dotenv";
import { existsSync } from "fs";

if (existsSync(".env.local")) {
  config({ path: ".env.local", override: true });
} else {
  config();
}

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql, isNull } from "drizzle-orm";
import { materials, manufacturers } from "../drizzle/schema";
import {
  buildSearchText,
  generateEmbeddingsBatch,
} from "../server/services/embedding-service";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not set");
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
  console.error("ERROR: OPENAI_API_KEY is not set");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl:
    DATABASE_URL.includes("azure") ||
    DATABASE_URL.includes("postgres.database.azure.com")
      ? { rejectUnauthorized: false }
      : false,
});
const db = drizzle(pool);

const BATCH_SIZE = 50;
const PAUSE_MS = 1000; // 1 second between batches

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("[embeddings] Ensuring pgvector extension is enabled...");
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);

  // Add the columns if they don't exist yet (safe to run repeatedly)
  await db.execute(
    sql`ALTER TABLE materials ADD COLUMN IF NOT EXISTS embedding vector(1536)`
  );
  await db.execute(
    sql`ALTER TABLE materials ADD COLUMN IF NOT EXISTS "searchText" text`
  );

  // Create an HNSW index for fast cosine-distance lookups
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS idx_materials_embedding
        ON materials USING hnsw (embedding vector_cosine_ops)`
  );

  // Create a GIN full-text index matching the hybrid keyword query expression
  // in server/services/search.ts (to_tsvector over name/productName/description).
  // The expression must match the query's exactly for the planner to use it,
  // so LIMIT-bounded keyword candidate lookups avoid a full-table scan + sort.
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS idx_materials_fts
        ON materials USING gin (
          to_tsvector('english', name || ' ' || COALESCE("productName", '') || ' ' || COALESCE(description, ''))
        )`
  );

  // Fetch materials that don't have an embedding yet
  const rows = await db
    .select({
      id: materials.id,
      name: materials.name,
      productName: materials.productName,
      category: materials.category,
      subcategory: materials.subcategory,
      description: materials.description,
      manufacturerId: materials.manufacturerId,
    })
    .from(materials)
    .where(isNull(materials.embedding));

  console.log(
    `[embeddings] Found ${rows.length} materials without embeddings`
  );

  if (rows.length === 0) {
    console.log("[embeddings] Nothing to do.");
    await pool.end();
    return;
  }

  // Preload manufacturer names
  const mfgIds = [
    ...new Set(
      rows.map((r) => r.manufacturerId).filter((id): id is number => id != null)
    ),
  ];
  const mfgMap = new Map<number, string>();
  if (mfgIds.length > 0) {
    const mfgRows = await db
      .select({ id: manufacturers.id, name: manufacturers.name })
      .from(manufacturers);
    for (const m of mfgRows) {
      mfgMap.set(m.id, m.name);
    }
  }

  let processed = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    // Build search texts
    const texts = batch.map((row) =>
      buildSearchText({
        name: row.name,
        productName: row.productName,
        category: row.category,
        subcategory: row.subcategory,
        description: row.description,
        manufacturerName:
          row.manufacturerId != null
            ? mfgMap.get(row.manufacturerId) ?? null
            : null,
      })
    );

    // Generate embeddings in one batch call
    const embeddings = await generateEmbeddingsBatch(texts);

    // Update each row
    for (let j = 0; j < batch.length; j++) {
      const emb = embeddings[j];
      if (!emb) {
        console.warn(
          `[embeddings] Skipping material ${batch[j].id} — no embedding returned`
        );
        continue;
      }

      const embString = `[${emb.join(",")}]`;
      await db.execute(
        sql`UPDATE materials
            SET embedding = ${embString}::vector,
                "searchText" = ${texts[j]},
                "updatedAt" = now()
            WHERE id = ${batch[j].id}`
      );
      processed++;
    }

    console.log(
      `[embeddings] Processed ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`
    );

    // Rate-limit pause (skip after the last batch)
    if (i + BATCH_SIZE < rows.length) {
      await sleep(PAUSE_MS);
    }
  }

  console.log(
    `[embeddings] Done. ${processed} materials updated with embeddings.`
  );
  await pool.end();
}

main().catch((err) => {
  console.error("[embeddings] Fatal error:", err);
  pool.end();
  process.exit(1);
});
