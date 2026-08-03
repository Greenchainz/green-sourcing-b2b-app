DO $$ BEGIN
  CREATE TYPE "supplier_verified_badge_status" AS ENUM ('UNVERIFIED', 'PARTIAL', 'VERIFIED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "suppliers"
  ADD COLUMN IF NOT EXISTS "verified_supplier_status" "supplier_verified_badge_status" NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN IF NOT EXISTS "verified_supplier_reasons" json NOT NULL DEFAULT '[]'::json,
  ADD COLUMN IF NOT EXISTS "verified_supplier_computed_at" timestamp,
  ADD COLUMN IF NOT EXISTS "verified_supplier_expires_at" timestamp;
