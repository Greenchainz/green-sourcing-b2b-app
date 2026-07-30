DO $$ BEGIN CREATE TYPE "public"."ca_document_status" AS ENUM('draft', 'open', 'answered', 'pending_approval', 'approved', 'rejected', 'closed'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."ca_document_type" AS ENUM('rfi', 'change_request'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."data_subject_request_status" AS ENUM('pending', 'in_progress', 'completed', 'rejected'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."data_subject_request_type" AS ENUM('access', 'correction', 'deletion'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."founder_video_status" AS ENUM('draft', 'ready', 'deleted'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."founder_video_transcript_status" AS ENUM('pending', 'done', 'failed'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."rfq_draft_status" AS ENUM('draft', 'approved', 'rejected'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."submittal_ball_in_court" AS ENUM('buyer', 'architect', 'supplier'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."submittal_status" AS ENUM('draft', 'submitted', 'approved_as_noted', 'revise_and_resubmit', 'rejected', 'closed'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."supplier_verified_badge_status" AS ENUM('UNVERIFIED', 'PARTIAL', 'VERIFIED'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
ALTER TYPE "public"."supplier_tier" ADD VALUE IF NOT EXISTS 'standard' BEFORE 'premium';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "about_youtube_videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"youtubeId" varchar(20) NOT NULL,
	"title" varchar(200) DEFAULT '' NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "about_youtube_videos_youtubeId_unique" UNIQUE("youtubeId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "arcade_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"gameId" varchar(64) NOT NULL,
	"initials" varchar(12) NOT NULL,
	"score" integer NOT NULL,
	"playerName" varchar(120),
	"email" varchar(320),
	"company" varchar(160),
	"eventKey" varchar(64),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actorUserId" integer,
	"actorEmail" varchar(320),
	"actorRole" varchar(32),
	"action" varchar(64) NOT NULL,
	"resourceType" varchar(64),
	"resourceId" varchar(128),
	"metadata" json,
	"outcome" varchar(16) DEFAULT 'success' NOT NULL,
	"ipAddress" varchar(64),
	"userAgent" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blockchain_anchors" (
	"id" serial PRIMARY KEY NOT NULL,
	"anchored_by_user_id" integer,
	"artifact_type" varchar(64) NOT NULL,
	"artifact_id" varchar(255) NOT NULL,
	"artifact_hash" varchar(66) NOT NULL,
	"context_hash" varchar(66) NOT NULL,
	"chain_id" integer NOT NULL,
	"contract_address" varchar(42) NOT NULL,
	"tx_hash" varchar(66) NOT NULL,
	"block_number" integer,
	"verification_status" varchar(32) DEFAULT 'anchored' NOT NULL,
	"anchored_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blockchain_anchors_tx_hash_unique" UNIQUE("tx_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ca_document_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"author_user_id" integer NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ca_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "ca_document_type" NOT NULL,
	"status" "ca_document_status" DEFAULT 'draft' NOT NULL,
	"ball_in_court" "submittal_ball_in_court" DEFAULT 'buyer' NOT NULL,
	"document_number" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"project_id" integer,
	"submittal_id" integer,
	"related_rfq_id" integer,
	"related_swap_validation_id" integer,
	"question" text,
	"official_response" text,
	"response_at" timestamp,
	"proposed_resolution" text,
	"cost_impact" numeric(12, 2),
	"schedule_impact_days" integer,
	"approved_at" timestamp,
	"closed_at" timestamp,
	"due_at" timestamp,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_of_week_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplierId" integer NOT NULL,
	"weekStartDate" date NOT NULL,
	"isPremiumSlot" boolean DEFAULT false NOT NULL,
	"showcasePageSlug" text NOT NULL,
	"emailSentAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "company_of_week_slots_showcasePageSlug_unique" UNIQUE("showcasePageSlug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "concierge_routes" (
	"id" serial PRIMARY KEY NOT NULL,
	"rfq_id" integer,
	"project_name" text NOT NULL,
	"project_location" text,
	"material_types" json DEFAULT '[]'::json NOT NULL,
	"architect_email" text NOT NULL,
	"architect_name" text,
	"architect_company" text,
	"supplier_id" integer NOT NULL,
	"supplier_name" text NOT NULL,
	"supplier_email" text,
	"notes" text,
	"sent_by" text DEFAULT 'jerit' NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"architect_replied" boolean DEFAULT false NOT NULL,
	"architect_replied_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "data_subject_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"requested_by_admin_id" integer,
	"target_user_id" integer NOT NULL,
	"type" "data_subject_request_type" NOT NULL,
	"status" "data_subject_request_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "founder_video_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"videoId" integer NOT NULL,
	"viewedAt" timestamp DEFAULT now() NOT NULL,
	"viewerIp" varchar(64),
	"userAgent" text,
	"durationWatchedSec" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "founder_videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerUserId" integer NOT NULL,
	"recipientEmail" varchar(320) NOT NULL,
	"recipientName" varchar(255) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"note" text,
	"shareToken" varchar(32) NOT NULL,
	"blobKey" text NOT NULL,
	"blobUrl" text NOT NULL,
	"durationSec" integer DEFAULT 0 NOT NULL,
	"status" "founder_video_status" DEFAULT 'draft' NOT NULL,
	"transcript" text,
	"transcriptStatus" "founder_video_transcript_status" DEFAULT 'pending' NOT NULL,
	"watchedCount" integer DEFAULT 0 NOT NULL,
	"firstWatchedAt" timestamp,
	"lastWatchedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp,
	CONSTRAINT "founder_videos_shareToken_unique" UNIQUE("shareToken")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(50) NOT NULL,
	"user_id" integer,
	"org_id" integer,
	"material_id" integer,
	"supplier_id" integer,
	"query" text,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_synthesis" (
	"id" serial PRIMARY KEY NOT NULL,
	"report" json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "material_credit_score_cache" (
	"epdId" integer PRIMARY KEY NOT NULL,
	"total" integer NOT NULL,
	"carbonEfficiency" integer NOT NULL,
	"epdVerification" integer NOT NULL,
	"manufacturerTransparency" integer NOT NULL,
	"assemblyOptionsCoverage" integer NOT NULL,
	"rulesVersion" varchar(32) DEFAULT 'ccps-policy-v1' NOT NULL,
	"inputFingerprint" varchar(64) DEFAULT '' NOT NULL,
	"epdValidityStatus" varchar(20) DEFAULT 'missing' NOT NULL,
	"staleReason" varchar(64),
	"expiresAt" timestamp DEFAULT now() NOT NULL,
	"computedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "material_credit_score_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"epdId" integer NOT NULL,
	"total" integer NOT NULL,
	"carbonEfficiency" integer NOT NULL,
	"epdVerification" integer NOT NULL,
	"manufacturerTransparency" integer NOT NULL,
	"assemblyOptionsCoverage" integer NOT NULL,
	"rulesVersion" varchar(32) NOT NULL,
	"inputFingerprint" varchar(64) NOT NULL,
	"epdValidityStatus" varchar(20) NOT NULL,
	"staleReason" varchar(64),
	"inputs" json,
	"expiresAt" timestamp NOT NULL,
	"computedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rfq_drafts" (
	"id" serial PRIMARY KEY NOT NULL,
	"architect_id" integer NOT NULL,
	"raw_input" text NOT NULL,
	"ai_output" json NOT NULL,
	"human_edits" json,
	"field_decisions" json,
	"rejection_reason" text,
	"status" "rfq_draft_status" DEFAULT 'draft' NOT NULL,
	"approved_at" timestamp,
	"approved_by_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rfq_match_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"draft_id" integer,
	"user_id" integer NOT NULL,
	"persona_key" varchar(50) NOT NULL,
	"agent_available" boolean NOT NULL,
	"match_source" varchar(32) NOT NULL,
	"candidate_count" integer DEFAULT 0 NOT NULL,
	"shortlist_count" integer DEFAULT 0 NOT NULL,
	"score_breakdowns" json,
	"reasoning_trace" json,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rfq_supplier_invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"rfq_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"match_score" numeric(5, 2),
	"email_sent" boolean DEFAULT false NOT NULL,
	"in_app_sent" boolean DEFAULT false NOT NULL,
	"responded_at" timestamp,
	"notified_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scraped_leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" varchar(255),
	"title" varchar(255),
	"email" varchar(320),
	"phone" varchar(50),
	"company" varchar(255) NOT NULL,
	"website" text,
	"city" varchar(100),
	"state" varchar(2),
	"role" varchar(50) NOT NULL,
	"source" varchar(100) NOT NULL,
	"linkedin_url" text,
	"outreach_sent_at" timestamp,
	"email_status" varchar(50) DEFAULT 'pending',
	"email_opens" integer DEFAULT 0,
	"email_clicks" integer DEFAULT 0,
	"email_bounced_at" timestamp,
	"last_engaged_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "submittal_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"submittal_id" integer NOT NULL,
	"material_id" integer,
	"supplier_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "supplier_buyer_fit_inputs" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplierId" integer NOT NULL,
	"projectZip" text NOT NULL,
	"distanceMiles" real,
	"leadTimeDays" integer,
	"avgRfqResponseHours" real,
	"priceIndexVsMedian" real,
	"completedRfqCount" integer DEFAULT 0 NOT NULL,
	"noShowCount" integer DEFAULT 0 NOT NULL,
	"buyerFitScore" real,
	"computedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "supplier_profile_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"viewer_user_id" integer NOT NULL,
	"viewer_role" varchar(32),
	"source" varchar(48),
	"view_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "supplier_sustainability_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"data_quality_level" varchar(2) DEFAULT 'L0' NOT NULL,
	"data_source_type" varchar(50),
	"has_epd" boolean DEFAULT false NOT NULL,
	"epd_reference" text,
	"scope1_emissions" numeric(14, 4),
	"scope2_emissions" numeric(14, 4),
	"total_emissions" numeric(14, 4),
	"electricity_kwh" numeric(14, 2),
	"natural_gas_mmbtu" numeric(14, 2),
	"diesel_gallons" numeric(14, 2),
	"annual_revenue" numeric(16, 2),
	"certifications" json DEFAULT '[]'::json,
	"calculation_method" varchar(100),
	"last_updated_by" integer,
	"verified_at" timestamp,
	"verified_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "supplier_sustainability_profiles_supplier_id_unique" UNIQUE("supplier_id")
);
--> statement-breakpoint
ALTER TABLE "assemblies" ADD COLUMN "stcRating" integer;--> statement-breakpoint
ALTER TABLE "assemblies" ADD COLUMN "iicRating" integer;--> statement-breakpoint
ALTER TABLE "assemblies" ADD COLUMN "airPermeance" varchar(120);--> statement-breakpoint
ALTER TABLE "assemblies" ADD COLUMN "vaporPermeance" varchar(120);--> statement-breakpoint
ALTER TABLE "assemblies" ADD COLUMN "windUpliftRating" varchar(120);--> statement-breakpoint
ALTER TABLE "assemblies" ADD COLUMN "flameSpreadIndex" integer;--> statement-breakpoint
ALTER TABLE "assemblies" ADD COLUMN "smokeDevelopmentIndex" integer;--> statement-breakpoint
ALTER TABLE "assemblies" ADD COLUMN "ulDesignNumber" varchar(80);--> statement-breakpoint
ALTER TABLE "assemblies" ADD COLUMN "loadCapacityPsf" integer;--> statement-breakpoint
ALTER TABLE "assemblies" ADD COLUMN "impactResistance" varchar(200);--> statement-breakpoint
ALTER TABLE "assemblies" ADD COLUMN "leedCredits" text;--> statement-breakpoint
ALTER TABLE "call_history" ADD COLUMN "group_call_id" text;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD COLUMN "claim_token" uuid DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD COLUMN "claim_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD COLUMN "claim_token_used_at" timestamp;--> statement-breakpoint
ALTER TABLE "epd_materials" ADD COLUMN "epd_expiry" date;--> statement-breakpoint
ALTER TABLE "epd_materials" ADD COLUMN "epd_program_operator" varchar(100);--> statement-breakpoint
ALTER TABLE "epd_materials" ADD COLUMN "interior_exterior" varchar(20);--> statement-breakpoint
ALTER TABLE "epd_materials" ADD COLUMN "r_value" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "epd_materials" ADD COLUMN "fire_rating" varchar(50);--> statement-breakpoint
ALTER TABLE "epd_materials" ADD COLUMN "astm_standards" json;--> statement-breakpoint
ALTER TABLE "epd_materials" ADD COLUMN "msf_factor" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "epd_materials" ADD COLUMN "title24_compliant" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "epd_materials" ADD COLUMN "iecc_compliant" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "epd_materials" ADD COLUMN "voc_compliant" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "epd_materials" ADD COLUMN "not_on_red_list" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "epd_materials" ADD COLUMN "hpd_available" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "epd_materials" ADD COLUMN "c2c_certified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "epd_materials" ADD COLUMN "fsc_certified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "epd_materials" ADD COLUMN "greenguard_gold" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "epd_materials" ADD COLUMN "declare_label" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "epd_materials" ADD COLUMN "recycled_content_pct" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "epd_materials" ADD COLUMN "regional_availability" json;--> statement-breakpoint
ALTER TABLE "epd_materials" ADD COLUMN "regional_within_500mi" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "epd_materials" ADD COLUMN "lead_time_days" integer;--> statement-breakpoint
ALTER TABLE "epd_materials" ADD COLUMN "price_per_unit" numeric(12, 4);--> statement-breakpoint
ALTER TABLE "epd_materials" ADD COLUMN "price_unit" varchar(30);--> statement-breakpoint
ALTER TABLE "epd_materials" ADD COLUMN "take_back_program" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "epd_materials" ADD COLUMN "min_order_quantity" integer;--> statement-breakpoint
ALTER TABLE "epd_materials" ADD COLUMN "leed_credits" json;--> statement-breakpoint
ALTER TABLE "epd_materials" ADD COLUMN "hardness_mohs" numeric(4, 1);--> statement-breakpoint
ALTER TABLE "epd_materials" ADD COLUMN "installability_hrs_sf" numeric(6, 3);--> statement-breakpoint
ALTER TABLE "epd_materials" ADD COLUMN "lifespan_years" integer;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "cdphCompliant" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "weightPerSf" numeric(8, 3);--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "wlcPaybackYears" integer;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "annualEnergySavingsPct" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "maintenanceCostPerSfPerYear" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "isSeamless" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "bleachResistant" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "cleaningProtocol" varchar(120);--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "scope3EmissionsKgCo2e" numeric(10, 3);--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "carbon_score" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "sectorTags" text[];--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "sourcewellListed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "leedDocReady" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "ccps_score" real;--> statement-breakpoint
ALTER TABLE "rfq_bids" ADD COLUMN "can_fulfill" boolean;--> statement-breakpoint
ALTER TABLE "rfq_bids" ADD COLUMN "field_values" json;--> statement-breakpoint
ALTER TABLE "rfq_bids" ADD COLUMN "gwp_value" numeric(14, 4);--> statement-breakpoint
ALTER TABLE "rfq_bids" ADD COLUMN "epd_reference" text;--> statement-breakpoint
ALTER TABLE "rfq_bids" ADD COLUMN "rfx_total_score" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "rfq_bids" ADD COLUMN "data_quality_level" varchar(2);--> statement-breakpoint
ALTER TABLE "rfq_bids" ADD COLUMN "gwp_meets_target" boolean;--> statement-breakpoint
ALTER TABLE "rfq_bids" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "rfq_items" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "rfq_requests" ADD COLUMN "draft_id" integer;--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "geocoded_at" timestamp;--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "geocode_source" varchar(32);--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "project_climate_zone" varchar(10);--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "request_type" varchar(40) DEFAULT 'rfq_quote';--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "response_field_schema" json;--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "scoring_weights" json;--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "shadow_carbon_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "gwp_cap_per_unit" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "gwp_cap_unit" varchar(50);--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "gwp_reduction_target" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "epd_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "verified_supplier_status" "supplier_verified_badge_status" DEFAULT 'UNVERIFIED' NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "verified_supplier_reasons" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "verified_supplier_computed_at" timestamp;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "verified_supplier_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "epdUrl" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "epdProgramOperator" varchar(150);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "tier" "supplier_tier" DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "leadCredits" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "weightedRankScore" real;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "microsoftSubscriptionId" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "microsoftPlanId" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "tierUpdatedAt" timestamp;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "specSheetUrl" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "otif_percentage" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "avg_lead_time_days" integer;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "lead_time_variance_days" integer;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "supplier_z_score" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "inventory_visibility" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "vet_last_updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "hits_digest_last_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatarUrl" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "acs_user_id" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ca_document_messages" ADD CONSTRAINT "ca_document_messages_document_id_ca_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."ca_documents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ca_document_messages" ADD CONSTRAINT "ca_document_messages_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ca_documents" ADD CONSTRAINT "ca_documents_submittal_id_submittals_id_fk" FOREIGN KEY ("submittal_id") REFERENCES "public"."submittals"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ca_documents" ADD CONSTRAINT "ca_documents_related_rfq_id_rfqs_id_fk" FOREIGN KEY ("related_rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ca_documents" ADD CONSTRAINT "ca_documents_related_swap_validation_id_swap_validations_id_fk" FOREIGN KEY ("related_swap_validation_id") REFERENCES "public"."swap_validations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ca_documents" ADD CONSTRAINT "ca_documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "concierge_routes" ADD CONSTRAINT "concierge_routes_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submittal_items" ADD CONSTRAINT "submittal_items_submittal_id_submittals_id_fk" FOREIGN KEY ("submittal_id") REFERENCES "public"."submittals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submittal_items" ADD CONSTRAINT "submittal_items_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submittal_items" ADD CONSTRAINT "submittal_items_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submittals" ADD CONSTRAINT "submittals_related_rfq_id_rfqs_id_fk" FOREIGN KEY ("related_rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submittals" ADD CONSTRAINT "submittals_related_swap_validation_id_swap_validations_id_fk" FOREIGN KEY ("related_swap_validation_id") REFERENCES "public"."swap_validations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submittals" ADD CONSTRAINT "submittals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "arcade_scores_board_idx" ON "arcade_scores" USING btree ("gameId","eventKey","score" DESC NULLS LAST,"createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_actor_idx" ON "audit_logs" USING btree ("actorUserId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_resource_idx" ON "audit_logs" USING btree ("resourceType","resourceId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bc_anchors_artifact" ON "blockchain_anchors" USING btree ("artifact_type","artifact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bc_anchors_tx_hash" ON "blockchain_anchors" USING btree ("tx_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bc_anchors_user" ON "blockchain_anchors" USING btree ("anchored_by_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bc_anchors_anchored_at" ON "blockchain_anchors" USING btree ("anchored_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ca_document_messages_document" ON "ca_document_messages" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ca_document_messages_author" ON "ca_document_messages" USING btree ("author_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ca_documents_type" ON "ca_documents" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ca_documents_status" ON "ca_documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ca_documents_created_by" ON "ca_documents" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ca_documents_submittal" ON "ca_documents" USING btree ("submittal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ca_documents_related_rfq" ON "ca_documents" USING btree ("related_rfq_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_concierge_routes_architect_email" ON "concierge_routes" USING btree ("architect_email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_concierge_routes_sent_at" ON "concierge_routes" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_concierge_routes_replied" ON "concierge_routes" USING btree ("architect_replied");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dsr_target_user" ON "data_subject_requests" USING btree ("target_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dsr_status" ON "data_subject_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_learning_events_type" ON "learning_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_learning_events_created" ON "learning_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_learning_events_material" ON "learning_events" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_learning_events_type_created" ON "learning_events" USING btree ("type","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_material_credit_score_snapshots_epd_computed" ON "material_credit_score_snapshots" USING btree ("epdId","computedAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_match_runs_draft" ON "rfq_match_runs" USING btree ("draft_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_match_runs_user" ON "rfq_match_runs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_match_runs_created_at" ON "rfq_match_runs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rsi_rfq" ON "rfq_supplier_invites" USING btree ("rfq_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rsi_supplier" ON "rfq_supplier_invites" USING btree ("supplier_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_rsi_unique" ON "rfq_supplier_invites" USING btree ("rfq_id","supplier_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_submittal_items_submittal" ON "submittal_items" USING btree ("submittal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_submittal_items_material" ON "submittal_items" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_submittal_items_supplier" ON "submittal_items" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_submittals_created_by" ON "submittals" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_submittals_project" ON "submittals" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_submittals_status" ON "submittals" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_submittals_related_rfq" ON "submittals" USING btree ("related_rfq_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_submittals_related_validation" ON "submittals" USING btree ("related_swap_validation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sbfi_supplier" ON "supplier_buyer_fit_inputs" USING btree ("supplierId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sbfi_zip" ON "supplier_buyer_fit_inputs" USING btree ("projectZip");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "supplier_profile_views_unique_day" ON "supplier_profile_views" USING btree ("supplier_id","viewer_user_id","view_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supplier_profile_views_supplier_idx" ON "supplier_profile_views" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supplier_profile_views_viewer_idx" ON "supplier_profile_views" USING btree ("viewer_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ssp_supplier" ON "supplier_sustainability_profiles" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ssp_quality" ON "supplier_sustainability_profiles" USING btree ("data_quality_level");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_decision_maker_personas_persona_key" ON "decision_maker_personas" USING btree ("personaKey");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_assembly_specs_name_unique" ON "material_assembly_specs" USING btree ("name");