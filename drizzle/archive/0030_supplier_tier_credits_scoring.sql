-- Migration: Supplier tier, lead credits, and scoring system
-- Created: 2026-04-15
--
-- Changes:
--   supplier_tier enum    - adds 'standard' value (was: free|premium)
--   suppliers             - tier, leadCredits, weightedRankScore,
--                           microsoftSubscriptionId, microsoftPlanId, tierUpdatedAt
--   supplier_buyer_fit_inputs  - NEW: per-(supplier, zip) buyer-fit scoring inputs
--   company_of_week_slots      - NEW: Company of the Week feature slots

-- ── 1. Extend supplier_tier enum ────────────────────────────────────────────
-- ADD VALUE is non-transactional in Postgres; must run outside a transaction block.
ALTER TYPE "supplier_tier" ADD VALUE IF NOT EXISTS 'standard' BEFORE 'premium';

-- ── 2. New columns on suppliers ─────────────────────────────────────────────
ALTER TABLE "suppliers"
  ADD COLUMN IF NOT EXISTS "tier"                   "supplier_tier" NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS "leadCredits"            INTEGER         NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "weightedRankScore"      REAL,
  ADD COLUMN IF NOT EXISTS "microsoftSubscriptionId" TEXT,
  ADD COLUMN IF NOT EXISTS "microsoftPlanId"        TEXT,
  ADD COLUMN IF NOT EXISTS "tierUpdatedAt"          TIMESTAMP;

-- ── 3. supplier_buyer_fit_inputs ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "supplier_buyer_fit_inputs" (
  "id"                   SERIAL PRIMARY KEY,
  "supplierId"           INTEGER NOT NULL REFERENCES "suppliers"("id") ON DELETE CASCADE,
  "projectZip"           TEXT    NOT NULL,
  "distanceMiles"        REAL,
  "leadTimeDays"         INTEGER,
  "avgRfqResponseHours"  REAL,
  "priceIndexVsMedian"   REAL,
  "completedRfqCount"    INTEGER NOT NULL DEFAULT 0,
  "noShowCount"          INTEGER NOT NULL DEFAULT 0,
  "buyerFitScore"        REAL,
  "computedAt"           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_sbfi_supplier" ON "supplier_buyer_fit_inputs"("supplierId");
CREATE INDEX IF NOT EXISTS "idx_sbfi_zip"      ON "supplier_buyer_fit_inputs"("projectZip");

-- ── 4. company_of_week_slots ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "company_of_week_slots" (
  "id"                SERIAL PRIMARY KEY,
  "supplierId"        INTEGER NOT NULL REFERENCES "suppliers"("id") ON DELETE CASCADE,
  "weekStartDate"     DATE    NOT NULL,
  "isPremiumSlot"     BOOLEAN NOT NULL DEFAULT false,
  "showcasePageSlug"  TEXT    NOT NULL,
  "emailSentAt"       TIMESTAMP,
  "createdAt"         TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "company_of_week_slots_showcasePageSlug_unique" UNIQUE ("showcasePageSlug")
);

CREATE INDEX IF NOT EXISTS "idx_cotw_supplier"    ON "company_of_week_slots"("supplierId");
CREATE INDEX IF NOT EXISTS "idx_cotw_week_start"  ON "company_of_week_slots"("weekStartDate");
