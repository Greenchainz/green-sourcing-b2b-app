/**
 * create-spec-tables.js  (ESM — package.json has "type":"module")
 * Creates the three architect spec tables that drizzle-kit push couldn't
 * create due to the PG17 "serial does not exist" bug.
 *
 * Run from D:\perplexitydownloads\green-sourcing-b2b-app:
 *   $env:DATABASE_URL="postgresql://founder:PASSWORD@greenchainz-db.postgres.database.azure.com/greenchainz?sslmode=require"
 *   node create-spec-tables.js
 */

import pg from "pg";
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();
  console.log("Connected to PostgreSQL");

  // ── Enums ────────────────────────────────────────────────────────────────
  await client.query(`
    DO $$ BEGIN
      CREATE TYPE spec_parse_status AS ENUM ('pending','processing','ready','failed');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  console.log("spec_parse_status enum ok");

  await client.query(`
    DO $$ BEGIN
      CREATE TYPE architect_persona AS ENUM ('aor','leed_ap','gc_pm','spec_writer','interior_designer');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  console.log("architect_persona enum ok");

  // ── architect_uploaded_specs ─────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS architect_uploaded_specs (
      id                SERIAL PRIMARY KEY,
      architect_id      INTEGER NOT NULL,
      original_filename VARCHAR(500) NOT NULL,
      blob_url          TEXT NOT NULL,
      mime_type         VARCHAR(100),
      file_size_bytes   INTEGER,
      parse_status      spec_parse_status NOT NULL DEFAULT 'pending',
      parse_started_at  TIMESTAMPTZ,
      parse_completed_at TIMESTAMPTZ,
      total_pages       INTEGER,
      total_assemblies  INTEGER NOT NULL DEFAULT 0,
      raw_extraction    JSONB,
      error_message     TEXT,
      project_name      VARCHAR(255),
      project_location  VARCHAR(255),
      estimated_value   DECIMAL(14,2),
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log("architect_uploaded_specs ok");

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_uploaded_specs_architect
      ON architect_uploaded_specs (architect_id);
    CREATE INDEX IF NOT EXISTS idx_uploaded_specs_status
      ON architect_uploaded_specs (parse_status);
  `);

  // ── architect_spec_assemblies ────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS architect_spec_assemblies (
      id                      SERIAL PRIMARY KEY,
      spec_id                 INTEGER NOT NULL REFERENCES architect_uploaded_specs(id) ON DELETE CASCADE,
      assembly_code           VARCHAR(20),
      assembly_name           VARCHAR(255),
      description             TEXT,
      assembly_type           VARCHAR(120),
      structural_option       INTEGER,
      declared_unit           VARCHAR(100),
      gwp_value               DECIMAL(14,4),
      gwp                     DECIMAL(14,4),
      gwp_unit                VARCHAR(50),
      gwp_per_1000sf          DECIMAL(14,4),
      quantity                VARCHAR(100),
      manufacturer_hint       VARCHAR(255),
      product_hint            VARCHAR(255),
      page_number             INTEGER,
      line_number             INTEGER,
      raw_row                 JSONB,
      matched_epd_material_id INTEGER,
      match_confidence        DECIMAL(4,3),
      created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log("architect_spec_assemblies ok");

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_spec_asm_spec   ON architect_spec_assemblies (spec_id);
    CREATE INDEX IF NOT EXISTS idx_spec_asm_code   ON architect_spec_assemblies (assembly_code);
    CREATE INDEX IF NOT EXISTS idx_spec_asm_match  ON architect_spec_assemblies (matched_epd_material_id);
  `);

  // ── generated_rfqs ───────────────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS generated_rfqs (
      id                      SERIAL PRIMARY KEY,
      spec_id                 INTEGER NOT NULL,
      rfq_id                  INTEGER NOT NULL,
      generated_format        VARCHAR(20) NOT NULL,
      output_blob_url         TEXT,
      alternative_count       INTEGER NOT NULL DEFAULT 0,
      total_carbon_savings_pct DECIMAL(6,2),
      created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log("generated_rfqs ok");

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_generated_rfq_spec ON generated_rfqs (spec_id);
    CREATE INDEX IF NOT EXISTS idx_generated_rfq_rfq  ON generated_rfqs (rfq_id);
  `);

  console.log("\n✅ All three tables created successfully.");
  await client.end();
}

run().catch((err) => {
  console.error("❌ Failed:", err.message);
  process.exit(1);
});
