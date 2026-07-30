ALTER TABLE "manufacturers" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
WITH "rfq_bids_ranked" AS (
  SELECT
    "id",
    row_number() OVER (PARTITION BY "rfqId", "supplierId" ORDER BY "id" DESC) AS "duplicate_rank"
  FROM "rfq_bids"
)
DELETE FROM "rfq_bids"
USING "rfq_bids_ranked"
WHERE "rfq_bids"."id" = "rfq_bids_ranked"."id"
  AND "rfq_bids_ranked"."duplicate_rank" > 1;