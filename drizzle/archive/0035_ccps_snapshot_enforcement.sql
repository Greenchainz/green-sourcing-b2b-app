-- Enforce server-side CCPS/MCS snapshot metadata and expiry policy.

ALTER TABLE "material_credit_score_cache"
  ADD COLUMN IF NOT EXISTS "rulesVersion" varchar(32) NOT NULL DEFAULT 'ccps-policy-v1',
  ADD COLUMN IF NOT EXISTS "inputFingerprint" varchar(64) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "epdValidityStatus" varchar(20) NOT NULL DEFAULT 'missing',
  ADD COLUMN IF NOT EXISTS "staleReason" varchar(64),
  ADD COLUMN IF NOT EXISTS "expiresAt" timestamp NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS "material_credit_score_snapshots" (
  "id" serial PRIMARY KEY,
  "epdId" integer NOT NULL REFERENCES epd_materials(id) ON DELETE CASCADE,
  "total" integer NOT NULL,
  "carbonEfficiency" integer NOT NULL,
  "epdVerification" integer NOT NULL,
  "manufacturerTransparency" integer NOT NULL,
  "assemblyOptionsCoverage" integer NOT NULL,
  "rulesVersion" varchar(32) NOT NULL,
  "inputFingerprint" varchar(64) NOT NULL,
  "epdValidityStatus" varchar(20) NOT NULL,
  "staleReason" varchar(64),
  "inputs" jsonb,
  "expiresAt" timestamp NOT NULL,
  "computedAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_material_credit_score_snapshots_epd_computed"
  ON "material_credit_score_snapshots" ("epdId", "computedAt");
