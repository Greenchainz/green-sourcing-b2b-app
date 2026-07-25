-- Supplier profile "hits" tracking + weekly digest throttle.
-- One row per (supplier, architect, day); unique index dedupes same-day views.

CREATE TABLE IF NOT EXISTS "supplier_profile_views" (
  "id" serial PRIMARY KEY NOT NULL,
  "supplier_id" integer NOT NULL,
  "viewer_user_id" integer NOT NULL,
  "viewer_role" varchar(32),
  "source" varchar(48),
  "view_date" date NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "supplier_profile_views_unique_day"
  ON "supplier_profile_views" ("supplier_id", "viewer_user_id", "view_date");
CREATE INDEX IF NOT EXISTS "supplier_profile_views_supplier_idx"
  ON "supplier_profile_views" ("supplier_id");
CREATE INDEX IF NOT EXISTS "supplier_profile_views_viewer_idx"
  ON "supplier_profile_views" ("viewer_user_id");

ALTER TABLE "suppliers"
  ADD COLUMN IF NOT EXISTS "hits_digest_last_sent_at" timestamp;
