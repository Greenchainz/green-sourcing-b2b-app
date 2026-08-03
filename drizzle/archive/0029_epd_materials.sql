-- Migration: Add epd_materials table for EPD ingestion pipeline
-- Created: 2026-04-01
--
-- Adds:
--   epd_materials - stores normalised EPD records ingested via the EPD pipeline.
--                   gwp_per_1000sf is the GWP value normalised to kgCO2e per 1,000 SF.

CREATE TABLE IF NOT EXISTS "epd_materials" (
  "id"               SERIAL PRIMARY KEY,
  "supplier_id"      INTEGER NOT NULL REFERENCES "suppliers"("id") ON DELETE CASCADE,
  "manufacturer_name" VARCHAR(255),
  "product_name"     VARCHAR(255) NOT NULL,
  "epd_number"       VARCHAR(100),
  "assembly_type"    VARCHAR(50),
  "core_option"      INTEGER,
  "gwp_raw"          DECIMAL(14,4),
  "gwp_unit"         VARCHAR(50),
  "gwp_per_1000sf"   DECIMAL(14,4),
  "declared_unit"    VARCHAR(100),
  "dimension_param"  VARCHAR(100),
  "notes"            TEXT,
  "created_at"       TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at"       TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_epd_materials_supplier"  ON "epd_materials"("supplier_id");
CREATE INDEX IF NOT EXISTS "idx_epd_materials_assembly"  ON "epd_materials"("assembly_type");
