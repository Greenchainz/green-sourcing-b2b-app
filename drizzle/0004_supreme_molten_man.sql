ALTER TABLE "manufacturers" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
WITH "rfq_bids_ranked" AS (
  SELECT
    "id",
    "rfqId",
    row_number() OVER (
      PARTITION BY "rfqId", "supplierId"
      ORDER BY
        -- Preserve accepted/winning bids as the canonical survivor
        CASE WHEN "status" = 'accepted' THEN 0 ELSE 1 END ASC,
        "id" DESC
    ) AS "duplicate_rank"
  FROM "rfq_bids"
),
"deleted_bids" AS (
  DELETE FROM "rfq_bids"
  USING "rfq_bids_ranked"
  WHERE "rfq_bids"."id" = "rfq_bids_ranked"."id"
    AND "rfq_bids_ranked"."duplicate_rank" > 1
  RETURNING "rfq_bids"."id" AS "deleted_id", "rfq_bids"."rfqId" AS "rfq_id"
)
UPDATE "rfq_analytics"
SET "winningBidId" = (
  SELECT "rfq_bids_ranked"."id"
  FROM "rfq_bids_ranked"
  WHERE "rfq_bids_ranked"."rfqId" = "rfq_analytics"."rfqId"
    AND "rfq_bids_ranked"."duplicate_rank" = 1
)
WHERE "rfq_analytics"."winningBidId" IN (SELECT "deleted_id" FROM "deleted_bids");