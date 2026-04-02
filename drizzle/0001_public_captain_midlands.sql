CREATE TYPE "public"."annual_project_volume" AS ENUM('under_1m', '1m_10m', '10m_50m', 'over_50m');--> statement-breakpoint
CREATE TYPE "public"."architect_status" AS ENUM('pending', 'active');--> statement-breakpoint
CREATE TYPE "public"."crm_contact_type" AS ENUM('supplier', 'architect_firm', 'architect');--> statement-breakpoint
CREATE TYPE "public"."crm_event_type" AS ENUM('email_sent', 'email_opened', 'email_clicked', 'replied', 'profile_claimed', 'demo_booked', 'converted_trial', 'converted_paying', 'note_added', 'status_changed', 'profile_viewed');--> statement-breakpoint
CREATE TYPE "public"."crm_stage" AS ENUM('prospect', 'contacted', 'engaged', 'claimed', 'trial', 'paying', 'churned', 'dead');--> statement-breakpoint
CREATE TYPE "public"."firm_type" AS ENUM('architecture_firm', 'engineering_firm', 'owner_developer', 'contractor', 'consultant');--> statement-breakpoint
CREATE TYPE "public"."rfq_request_status" AS ENUM('pending', 'accepted', 'declined', 'fulfilled');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "architect_download_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"architect_id" integer NOT NULL,
	"material_id" integer NOT NULL,
	"bypass_method" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "architect_referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"referrer_id" integer NOT NULL,
	"referee_email" varchar(320) NOT NULL,
	"referee_id" integer,
	"credited_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "architects" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"firstName" varchar(100) NOT NULL,
	"lastName" varchar(100) NOT NULL,
	"email" varchar(320) NOT NULL,
	"phone" varchar(50),
	"firmName" varchar(255) NOT NULL,
	"firmType" "firm_type" NOT NULL,
	"licenseNumber" varchar(100),
	"licenseState" varchar(2),
	"annualProjectVolume" "annual_project_volume",
	"projectTypes" json DEFAULT '[]'::json,
	"sustainabilityGoals" json DEFAULT '[]'::json,
	"preferredCertifications" json DEFAULT '[]'::json,
	"location" varchar(100),
	"state" varchar(50),
	"zipCode" varchar(20),
	"primaryProjectRegion" varchar(50),
	"leedAccredited" boolean DEFAULT false,
	"status" "architect_status" DEFAULT 'pending' NOT NULL,
	"download_credits" integer DEFAULT 2 NOT NULL,
	"referral_code" varchar(20),
	"profile_credits_granted" json DEFAULT '[]'::json,
	"autodesk_connected" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "architects_userId_unique" UNIQUE("userId"),
	CONSTRAINT "architects_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "crm_contact_type" DEFAULT 'supplier' NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"contact_name" varchar(255),
	"email" varchar(320),
	"website" varchar(500),
	"location" varchar(255),
	"category" varchar(100),
	"subcategory" varchar(100),
	"key_product" text,
	"pitch_angle" text,
	"has_epd" boolean DEFAULT false,
	"readiness_level" varchar(20),
	"stage" "crm_stage" DEFAULT 'prospect' NOT NULL,
	"internal_notes" text,
	"source" varchar(100),
	"linkedin_url" varchar(500),
	"supplier_id" integer,
	"last_contacted_at" timestamp,
	"next_follow_up_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_email_sequences" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"sequence_name" varchar(100) NOT NULL,
	"step" integer DEFAULT 1 NOT NULL,
	"scheduled_at" timestamp,
	"sent_at" timestamp,
	"opened_at" timestamp,
	"clicked_at" timestamp,
	"replied_at" timestamp,
	"bounced_at" timestamp,
	"unsubscribed_at" timestamp,
	"resend_message_id" varchar(255),
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"event_type" "crm_event_type" NOT NULL,
	"subject" varchar(500),
	"body" text,
	"notes" text,
	"performed_by" varchar(100) DEFAULT 'system',
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"email" varchar(320) NOT NULL,
	"salt" "bytea" NOT NULL,
	"hash" "bytea" NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_credentials_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "engagement_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"action" varchar(50) NOT NULL,
	"creditsEarned" integer DEFAULT 0 NOT NULL,
	"metadata" json,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "epd_materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"manufacturer_name" varchar(255),
	"product_name" varchar(255) NOT NULL,
	"epd_number" varchar(100),
	"assembly_type" varchar(50),
	"core_option" integer,
	"gwp_raw" numeric(14, 4),
	"gwp_unit" varchar(50),
	"gwp_per_1000sf" numeric(14, 4),
	"declared_unit" varchar(100),
	"dimension_param" varchar(100),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ews_carbon_components" (
	"id" serial PRIMARY KEY NOT NULL,
	"assembly_spec_id" integer NOT NULL,
	"zone" varchar(20) NOT NULL,
	"layer_order" integer NOT NULL,
	"layer_name" varchar(255) NOT NULL,
	"framing_option" integer,
	"manufacturer" varchar(255),
	"product_name" varchar(255),
	"epd_number" varchar(100),
	"dimension_param" varchar(100),
	"gwp_value" numeric(12, 4),
	"gwp_units" varchar(50),
	"declared_unit" varchar(50),
	"msf_factor" numeric(12, 4),
	"carbon_per_1000sf" numeric(12, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lead_time_catalog" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" varchar(100) NOT NULL,
	"subcategory" varchar(100),
	"product" varchar(255),
	"weeks_min" integer NOT NULL,
	"weeks_max" integer NOT NULL,
	"notes" text,
	"source" varchar(255),
	"as_of" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "price_indices" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" varchar(100) NOT NULL,
	"series_id" varchar(50) NOT NULL,
	"series_name" varchar(255),
	"period" varchar(10) NOT NULL,
	"value" numeric(14, 4) NOT NULL,
	"yoy_change_pct" numeric(8, 4),
	"source" varchar(50) DEFAULT 'FRED' NOT NULL,
	"scraped_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"referrer_id" integer NOT NULL,
	"referred_email" varchar(320) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rfq_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"architect_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"material_id" integer,
	"material_type" varchar(255) NOT NULL,
	"quantity" numeric(12, 2) NOT NULL,
	"specs" text,
	"message" text,
	"status" "rfq_request_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scraper_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"scraper_name" varchar(100) NOT NULL,
	"status" varchar(20) DEFAULT 'running' NOT NULL,
	"records_processed" integer DEFAULT 0,
	"records_created" integer DEFAULT 0,
	"records_updated" integer DEFAULT 0,
	"error_message" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"duration_ms" integer,
	"metadata" json
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "supplier_material_epds" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplierId" integer NOT NULL,
	"materialId" integer,
	"materialName" varchar(255),
	"productName" varchar(255),
	"epdNumber" varchar(100),
	"epdUrl" text,
	"gwpA1A3" numeric(10, 4),
	"gwpDeclaredUnit" varchar(50),
	"verifiedAt" timestamp,
	"source" varchar(100),
	"epdProgramOperator" varchar(150),
	"gwpValue" numeric(12, 4),
	"gwpUnit" varchar(50) DEFAULT 'kgCO2e',
	"declaredUnit" varchar(100),
	"externallyVerified" boolean DEFAULT false,
	"expiresAt" timestamp,
	"status" "verification_status" DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_engagement" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"credits" integer DEFAULT 0 NOT NULL,
	"currentStreak" integer DEFAULT 0 NOT NULL,
	"longestStreak" integer DEFAULT 0 NOT NULL,
	"lastCheckIn" timestamp,
	"totalCheckIns" integer DEFAULT 0 NOT NULL,
	"tier" varchar(20) DEFAULT 'explorer' NOT NULL,
	"rfqsSubmitted" integer DEFAULT 0 NOT NULL,
	"referrals" integer DEFAULT 0 NOT NULL,
	"comparisons" integer DEFAULT 0 NOT NULL,
	"specSheetsGenerated" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "manufacturers" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "manufacturers" ADD COLUMN "category" varchar(100);--> statement-breakpoint
ALTER TABLE "manufacturers" ADD COLUMN "subcategory" varchar(100);--> statement-breakpoint
ALTER TABLE "manufacturers" ADD COLUMN "location" varchar(255);--> statement-breakpoint
ALTER TABLE "manufacturers" ADD COLUMN "keyProduct" varchar(255);--> statement-breakpoint
ALTER TABLE "manufacturers" ADD COLUMN "pitchAngle" text;--> statement-breakpoint
ALTER TABLE "manufacturers" ADD COLUMN "hasEpd" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "manufacturers" ADD COLUMN "readinessLevel" varchar(20);--> statement-breakpoint
ALTER TABLE "manufacturers" ADD COLUMN "claimed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "manufacturers" ADD COLUMN "claimedByUserId" integer;--> statement-breakpoint
ALTER TABLE "manufacturers" ADD COLUMN "claimedAt" timestamp;--> statement-breakpoint
ALTER TABLE "manufacturers" ADD COLUMN "profileViews" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "manufacturers" ADD COLUMN "featured" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "manufacturers" ADD COLUMN "dataSource" varchar(100);--> statement-breakpoint
ALTER TABLE "manufacturers" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "material_assembly_specs" ADD COLUMN "epd_number" varchar(100);--> statement-breakpoint
ALTER TABLE "material_assembly_specs" ADD COLUMN "gwp_a1_a3" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "material_assembly_specs" ADD COLUMN "gwp_declared_unit" varchar(50);--> statement-breakpoint
ALTER TABLE "material_assembly_specs" ADD COLUMN "gwp_per_1000sf" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "material_assembly_specs" ADD COLUMN "gwp_msf_factor" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "material_assembly_specs" ADD COLUMN "carbon_tier" varchar(20);--> statement-breakpoint
ALTER TABLE "material_assembly_specs" ADD COLUMN "assembly_type_tags" text[];--> statement-breakpoint
ALTER TABLE "material_assembly_specs" ADD COLUMN "framing_type_tags" text[];--> statement-breakpoint
ALTER TABLE "material_assembly_specs" ADD COLUMN "exterior_finish_tags" text[];--> statement-breakpoint
ALTER TABLE "material_assembly_specs" ADD COLUMN "certification_tags" text[];--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "searchText" text;--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "deposit_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "deposit_payment_intent_id" varchar(255);--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "deposit_amount" numeric;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "contactName" varchar(255);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "materialCategories" json;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "linkedin_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "linkedin_profile_url" varchar(500);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "linkedin_verified_at" timestamp;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_crm_contacts_company" ON "crm_contacts" USING btree ("company_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_crm_contacts_stage" ON "crm_contacts" USING btree ("stage");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_crm_contacts_category" ON "crm_contacts" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_crm_contacts_email" ON "crm_contacts" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_crm_seq_contact_step" ON "crm_email_sequences" USING btree ("contact_id","step");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_crm_seq_status" ON "crm_email_sequences" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_crm_seq_scheduled" ON "crm_email_sequences" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_crm_events_contact" ON "crm_events" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_crm_events_type" ON "crm_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_crm_events_created" ON "crm_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_epd_materials_supplier" ON "epd_materials" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_epd_materials_assembly" ON "epd_materials" USING btree ("assembly_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ews_carbon_comp_assembly" ON "ews_carbon_components" USING btree ("assembly_spec_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ews_carbon_comp_zone" ON "ews_carbon_components" USING btree ("zone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lead_time_category" ON "lead_time_catalog" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_price_series_period" ON "price_indices" USING btree ("series_id","period");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_price_category" ON "price_indices" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scraper_runs_name" ON "scraper_runs" USING btree ("scraper_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scraper_runs_status" ON "scraper_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scraper_runs_started" ON "scraper_runs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_assembly_epd_number" ON "material_assembly_specs" USING btree ("epd_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_assembly_carbon_tier" ON "material_assembly_specs" USING btree ("carbon_tier");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_assembly_type_tags" ON "material_assembly_specs" USING btree ("assembly_type_tags");