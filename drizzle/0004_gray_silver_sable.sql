ALTER TABLE "rfqs" ALTER COLUMN "deposit_amount" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "manufacturers" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
-- All indexes are created outside this transaction by the concurrent runner.
-- Run:  pnpm db:indexes
-- Reason: CREATE INDEX CONCURRENTLY is forbidden inside a transaction block (which
-- drizzle-kit migrate uses). Running indexes concurrently avoids ShareLock table
-- locks that would block all writes during migration on a live database.