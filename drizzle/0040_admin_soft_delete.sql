-- Migration: 0040_admin_soft_delete
-- Adds a nullable "deleted_at" soft-delete marker to the three core admin-managed
-- entities: users, manufacturers, and suppliers.
--
-- Rationale: the admin (founder) needs delete control over these records without
-- shattering the dense, mostly convention-based foreign-key history that points at
-- them (~25 tables reference users.id, ~20 reference suppliers.id, materials point
-- at manufacturers). A soft delete (deletedAt set + filtered out of auth / public
-- directory / spotlight / matcher reads) is the safe default, mirroring the existing
-- pattern already used on rfqs / rfq_items / rfq_bids. A hard purge remains available
-- from the admin router behind an extra confirmation.
--
-- Idempotent + safe to re-run.

ALTER TABLE "users"         ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "manufacturers" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "suppliers"     ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;

-- Partial indexes: normal reads only ever want the "live" rows, so index the common
-- `WHERE deleted_at IS NULL` predicate to keep directory / matcher scans fast.
CREATE INDEX IF NOT EXISTS "idx_users_not_deleted"         ON "users" ("id")         WHERE "deleted_at" IS NULL;
CREATE INDEX IF NOT EXISTS "idx_manufacturers_not_deleted" ON "manufacturers" ("id") WHERE "deleted_at" IS NULL;
CREATE INDEX IF NOT EXISTS "idx_suppliers_not_deleted"     ON "suppliers" ("id")     WHERE "deleted_at" IS NULL;
