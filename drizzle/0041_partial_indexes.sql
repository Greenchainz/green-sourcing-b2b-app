-- Migration: convert two full indexes to partial indexes
--
-- 1. rfq_bids: enforce uniqueness only for active (non-deleted) bids so that
--    soft-deleted rows and revisions do not block resubmission.
-- 2. notifications: restrict the user-unread index to unread rows only
--    (the hot-path query never touches already-read notifications).
--
-- Both operations require an exclusive lock on the table for the duration of
-- the index rebuild.  Run during a low-traffic window.

-- ── rfq_bids ───────────────────────────────────────────────────────────────

DROP INDEX IF EXISTS "idx_rfq_bids_rfq_supplier";--> statement-breakpoint
CREATE UNIQUE INDEX "idx_rfq_bids_rfq_supplier"
  ON "rfq_bids" ("rfqId", "supplierId")
  WHERE deleted_at IS NULL;--> statement-breakpoint

-- ── notifications ──────────────────────────────────────────────────────────

DROP INDEX IF EXISTS "idx_notifications_user_unread";--> statement-breakpoint
CREATE INDEX "idx_notifications_user_unread"
  ON "notifications" ("userId")
  WHERE "isRead" = false;
