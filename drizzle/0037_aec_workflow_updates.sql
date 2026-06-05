ALTER TABLE "architect_spec_assemblies"
ADD COLUMN IF NOT EXISTS "masterformat_section" varchar(20);

DO $$
BEGIN
  CREATE TYPE "submittal_status" AS ENUM (
    'draft',
    'submitted',
    'approved_as_noted',
    'revise_and_resubmit',
    'rejected',
    'closed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  CREATE TYPE "submittal_ball_in_court" AS ENUM ('buyer', 'architect', 'supplier');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "submittals" (
  "id" serial PRIMARY KEY NOT NULL,
  "project_id" integer,
  "spec_section" varchar(50),
  "masterformat_code" varchar(20),
  "submittal_number" varchar(100) NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "status" "submittal_status" DEFAULT 'draft' NOT NULL,
  "ball_in_court" "submittal_ball_in_court" DEFAULT 'buyer' NOT NULL,
  "submitted_at" timestamp,
  "due_at" timestamp,
  "required_on_site_at" timestamp,
  "returned_at" timestamp,
  "related_rfq_id" integer,
  "related_swap_validation_id" integer,
  "created_by" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "submittal_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "submittal_id" integer NOT NULL,
  "material_id" integer,
  "supplier_id" integer,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_submittals_created_by" ON "submittals" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "idx_submittals_project" ON "submittals" USING btree ("project_id");
CREATE INDEX IF NOT EXISTS "idx_submittals_status" ON "submittals" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_submittals_related_rfq" ON "submittals" USING btree ("related_rfq_id");
CREATE INDEX IF NOT EXISTS "idx_submittals_related_validation" ON "submittals" USING btree ("related_swap_validation_id");
CREATE INDEX IF NOT EXISTS "idx_submittal_items_submittal" ON "submittal_items" USING btree ("submittal_id");
CREATE INDEX IF NOT EXISTS "idx_submittal_items_material" ON "submittal_items" USING btree ("material_id");
CREATE INDEX IF NOT EXISTS "idx_submittal_items_supplier" ON "submittal_items" USING btree ("supplier_id");
