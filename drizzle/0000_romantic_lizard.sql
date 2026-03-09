CREATE TYPE "public"."agent_mode" AS ENUM('agent_first', 'human_only', 'hybrid');--> statement-breakpoint
CREATE TYPE "public"."agent_role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "public"."buyer_status" AS ENUM('active', 'canceled', 'past_due', 'suspended', 'pending', 'trial');--> statement-breakpoint
CREATE TYPE "public"."call_status" AS ENUM('completed', 'missed', 'rejected', 'failed');--> statement-breakpoint
CREATE TYPE "public"."call_type" AS ENUM('voice', 'video');--> statement-breakpoint
CREATE TYPE "public"."compliance_grade" AS ENUM('A', 'B', 'C', 'D', 'F');--> statement-breakpoint
CREATE TYPE "public"."created_by" AS ENUM('algorithm', 'agent', 'admin');--> statement-breakpoint
CREATE TYPE "public"."handoff_mode" AS ENUM('always_agent', 'hybrid', 'immediate_human');--> statement-breakpoint
CREATE TYPE "public"."handoff_status" AS ENUM('agent', 'pending_handoff', 'human');--> statement-breakpoint
CREATE TYPE "public"."material_spec_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."message_sender_type" AS ENUM('user', 'agent', 'support');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('rfq_new', 'rfq_match', 'new_message', 'bid_accepted', 'bid_rejected', 'rfq_closed', 'rfq_bid_received');--> statement-breakpoint
CREATE TYPE "public"."rfq_bid_status" AS ENUM('submitted', 'accepted', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."rfq_status" AS ENUM('draft', 'submitted', 'responded', 'awarded', 'closed');--> statement-breakpoint
CREATE TYPE "public"."rfq_thread_status" AS ENUM('active', 'closed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."sender_type" AS ENUM('buyer', 'supplier');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'suspended', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."subscription_tier" AS ENUM('free', 'standard', 'premium');--> statement-breakpoint
CREATE TYPE "public"."supplier_status" AS ENUM('active', 'canceled', 'past_due', 'suspended', 'pending');--> statement-breakpoint
CREATE TYPE "public"."supplier_tier" AS ENUM('free', 'premium');--> statement-breakpoint
CREATE TYPE "public"."sustainability_tier" AS ENUM('good', 'better', 'best');--> statement-breakpoint
CREATE TYPE "public"."swap_tier" AS ENUM('good', 'better', 'best');--> statement-breakpoint
CREATE TYPE "public"."swap_validation_status" AS ENUM('APPROVED', 'EXPERIMENTAL', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."usage_dimension" AS ENUM('rfq_submission', 'ai_query', 'swap_analysis', 'ccps_export', 'material_comparison', 'supplier_match', 'message_thread', 'bid_submission', 'video_call', 'message_sent');--> statement-breakpoint
CREATE TYPE "public"."user_persona" AS ENUM('architect', 'leed_ap', 'gc_pm', 'spec_writer', 'owner', 'facility_manager', 'default');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin', 'buyer', 'supplier');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."video_call_status" AS ENUM('initiated', 'ringing', 'connected', 'ended', 'failed');--> statement-breakpoint
CREATE TABLE "agent_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessionId" varchar(255) NOT NULL,
	"agent" varchar(50) NOT NULL,
	"intentClassified" varchar(100),
	"confidence" numeric(3, 2),
	"toolsUsed" text,
	"responseTimeMs" integer,
	"escalated" boolean DEFAULT false,
	"handedOffToHuman" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"sessionId" varchar(255) NOT NULL,
	"agent" varchar(50) NOT NULL,
	"role" "agent_role" NOT NULL,
	"content" text NOT NULL,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_handoff_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplierId" integer NOT NULL,
	"handoffMode" "handoff_mode" DEFAULT 'hybrid' NOT NULL,
	"maxAgentMessages" integer DEFAULT 5 NOT NULL,
	"businessHoursStart" varchar(5),
	"businessHoursEnd" varchar(5),
	"businessDays" varchar(50) DEFAULT 'Mon,Tue,Wed,Thu,Fri',
	"timezone" varchar(50) DEFAULT 'America/New_York',
	"customAgentPrompt" text,
	"autoDeflectEnabled" boolean DEFAULT true NOT NULL,
	"totalConversations" integer DEFAULT 0 NOT NULL,
	"agentResolutionRate" integer DEFAULT 0 NOT NULL,
	"avgMessagesBeforeHandoff" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_handoff_rules_supplierId_unique" UNIQUE("supplierId")
);
--> statement-breakpoint
CREATE TABLE "assemblies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50),
	"assemblyType" varchar(100) NOT NULL,
	"description" text,
	"sustainabilityTier" "sustainability_tier" DEFAULT 'good',
	"totalGwpPer1000Sqft" numeric(12, 2),
	"totalRValue" numeric(8, 2),
	"estimatedCostPer1000Sqft" numeric(10, 2),
	"fireRating" varchar(50),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assembly_components" (
	"id" serial PRIMARY KEY NOT NULL,
	"assemblyId" integer NOT NULL,
	"materialId" integer,
	"layerOrder" integer NOT NULL,
	"layerName" varchar(255) NOT NULL,
	"thickness" varchar(50),
	"gwpContribution" numeric(12, 4),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "assembly_spec_components" (
	"id" serial PRIMARY KEY NOT NULL,
	"assembly_spec_id" integer NOT NULL,
	"material_id" integer NOT NULL,
	"layer_order" integer NOT NULL,
	"layer_name" varchar(255) NOT NULL,
	"quantity" numeric(8, 2) NOT NULL,
	"unit" varchar(50) NOT NULL,
	"thickness_inches" numeric(5, 2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buyer_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"tier" "subscription_tier" DEFAULT 'free',
	"msSubscriptionId" varchar(255),
	"msPlanId" varchar(255),
	"status" "buyer_status" DEFAULT 'active',
	"trialEndsAt" timestamp,
	"renewalDate" timestamp,
	"isBeta" boolean DEFAULT false,
	"maxSeats" integer DEFAULT 1,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversationId" integer NOT NULL,
	"callerId" integer NOT NULL,
	"receiverId" integer NOT NULL,
	"callType" "call_type" NOT NULL,
	"status" "call_status" NOT NULL,
	"startTime" timestamp NOT NULL,
	"endTime" timestamp,
	"durationSeconds" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ccps_baselines" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" varchar(100) NOT NULL,
	"baselineGwpPerUnit" numeric(12, 4),
	"baselinePricePerUnit" numeric(10, 2),
	"baselineLeadTimeDays" integer,
	"baselineRecycledPct" numeric(5, 2),
	"sampleSize" integer,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ccps_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"materialId" integer NOT NULL,
	"personaKey" varchar(50) NOT NULL,
	"carbonScore" integer,
	"complianceScore" integer,
	"certificationScore" integer,
	"costScore" integer,
	"supplyChainScore" integer,
	"healthScore" integer,
	"ccpsTotal" integer,
	"sourcingDifficulty" integer,
	"calculatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "climate_zone_adjustments" (
	"id" serial PRIMARY KEY NOT NULL,
	"climate_zone" varchar(10) NOT NULL,
	"material_type" varchar(100) NOT NULL,
	"durability_multiplier" numeric(3, 2) DEFAULT '1.0',
	"r_value_multiplier" numeric(3, 2) DEFAULT '1.0',
	"carbon_impact_multiplier" numeric(3, 2) DEFAULT '1.0',
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"state" varchar(2) NOT NULL,
	"building_code" varchar(100) NOT NULL,
	"rule_name" varchar(255) NOT NULL,
	"rule_description" text,
	"applies_to_materials" json DEFAULT '[]'::json,
	"compliance_type" varchar(50),
	"compliance_value" varchar(100),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"rfqId" integer,
	"buyerId" integer NOT NULL,
	"supplierId" integer NOT NULL,
	"agentMode" "agent_mode" DEFAULT 'agent_first' NOT NULL,
	"handoffStatus" "handoff_status" DEFAULT 'agent' NOT NULL,
	"agentMessageCount" integer DEFAULT 0 NOT NULL,
	"handoffRequestedAt" timestamp,
	"handoffReason" text,
	"lastMessage" text,
	"lastMessageAt" timestamp DEFAULT now() NOT NULL,
	"isPinned" boolean DEFAULT false NOT NULL,
	"isArchived" boolean DEFAULT false NOT NULL,
	"label" varchar(50),
	"labelColor" varchar(20),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_maker_personas" (
	"id" serial PRIMARY KEY NOT NULL,
	"personaKey" varchar(50) NOT NULL,
	"title" varchar(100) NOT NULL,
	"description" text,
	"carbonWeight" numeric(4, 2),
	"complianceWeight" numeric(4, 2),
	"certificationWeight" numeric(4, 2),
	"costWeight" numeric(4, 2),
	"supplyChainWeight" numeric(4, 2),
	"healthWeight" numeric(4, 2)
);
--> statement-breakpoint
CREATE TABLE "email_suppression_list" (
	"email" varchar(255) PRIMARY KEY NOT NULL,
	"reason" varchar(100),
	"suppressed_at" timestamp DEFAULT now() NOT NULL,
	"permanent" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"name" varchar(255),
	"company" varchar(255),
	"source" varchar(100),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_acceptances" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"termsAccepted" boolean DEFAULT false NOT NULL,
	"termsAcceptedAt" timestamp,
	"termsVersion" varchar(50) DEFAULT '1.0',
	"privacyAccepted" boolean DEFAULT false NOT NULL,
	"privacyAcceptedAt" timestamp,
	"privacyVersion" varchar(50) DEFAULT '1.0',
	"cookieConsentGiven" boolean DEFAULT false NOT NULL,
	"cookieConsentAt" timestamp,
	"ipAddress" varchar(45),
	"userAgent" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "location_pricing_adjustments" (
	"id" serial PRIMARY KEY NOT NULL,
	"state" varchar(2) NOT NULL,
	"material_type" varchar(100) NOT NULL,
	"price_multiplier" numeric(3, 2) DEFAULT '1.0',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manufacturers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"website" text,
	"logoUrl" text,
	"phone" varchar(50),
	"email" varchar(320),
	"headquarters" varchar(255),
	"sustainabilityPageUrl" text,
	"verified" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_assembly_specs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"description" text,
	"total_thickness_inches" numeric(5, 2),
	"total_r_value" numeric(5, 2),
	"fire_rating" varchar(50),
	"ul_design_number" varchar(50),
	"stc_rating" integer,
	"iic_rating" integer,
	"total_cost_per_sf" numeric(10, 2),
	"total_gwp_per_sf" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_certifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"materialId" integer NOT NULL,
	"certificationType" varchar(100) NOT NULL,
	"certificationName" varchar(255),
	"certificationNumber" varchar(100),
	"issuingBody" varchar(255),
	"issueDate" timestamp,
	"expirationDate" timestamp,
	"certificationUrl" text,
	"leedCreditCategory" varchar(100),
	"leedCreditNumber" varchar(50),
	"leedPointsValue" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_specs" (
	"id" serial PRIMARY KEY NOT NULL,
	"materialId" integer NOT NULL,
	"supplierId" integer NOT NULL,
	"submittedBy" integer NOT NULL,
	"status" "material_spec_status" DEFAULT 'pending' NOT NULL,
	"fireRating" varchar(50),
	"fireRatingStandard" varchar(100),
	"rValue" numeric(8, 2),
	"thermalUValue" numeric(8, 4),
	"compressiveStrength" varchar(100),
	"tensileStrength" varchar(100),
	"astmStandards" text,
	"meetsTitle24" boolean DEFAULT false,
	"meetsIecc" boolean DEFAULT false,
	"buildingCodes" text,
	"pricePerUnit" numeric(10, 2),
	"priceUnit" varchar(50),
	"minimumOrderQuantity" integer,
	"moqUnit" varchar(50),
	"bulkDiscountAvailable" boolean DEFAULT false,
	"leadTimeDays" integer,
	"manufacturingLocation" varchar(255),
	"usManufactured" boolean DEFAULT false,
	"regionalAvailabilityMiles" integer,
	"shippingRegions" text,
	"inStock" boolean DEFAULT true,
	"stockQuantity" integer,
	"vocLevel" varchar(50),
	"vocCertification" varchar(100),
	"onRedList" boolean DEFAULT false,
	"toxicityRating" varchar(50),
	"indoorAirQualityRating" varchar(50),
	"hasEpd" boolean DEFAULT false,
	"hasHpd" boolean DEFAULT false,
	"hasFsc" boolean DEFAULT false,
	"hasC2c" boolean DEFAULT false,
	"hasGreenguard" boolean DEFAULT false,
	"hasDeclare" boolean DEFAULT false,
	"certificationUrls" text,
	"datasheetUrl" text,
	"specSheetUrl" text,
	"testReportUrls" text,
	"notes" text,
	"recycledContentPct" numeric(5, 2),
	"warrantyYears" integer,
	"expectedLifecycleYears" integer,
	"reviewedBy" integer,
	"reviewedAt" timestamp,
	"rejectionReason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_swaps" (
	"id" serial PRIMARY KEY NOT NULL,
	"materialId" integer NOT NULL,
	"swapMaterialId" integer NOT NULL,
	"swapReason" text,
	"swapScore" integer NOT NULL,
	"swapTier" "swap_tier" NOT NULL,
	"confidence" numeric(5, 2) NOT NULL,
	"createdBy" "created_by" NOT NULL,
	"usageCount" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_technical_specs" (
	"id" serial PRIMARY KEY NOT NULL,
	"material_id" integer NOT NULL,
	"astm_codes" json DEFAULT '[]'::json,
	"ul_listing" varchar(255),
	"ul_design_number" varchar(50),
	"icc_es_report" varchar(50),
	"fire_rating" varchar(50),
	"fire_rating_standard" varchar(100),
	"char_rate" varchar(50),
	"compressive_strength_psi" integer,
	"modulus_of_elasticity_ksi" integer,
	"flexural_strength_psi" integer,
	"tensile_strength_psi" integer,
	"stiffness_ksi" integer,
	"r_value_per_inch" numeric(5, 2),
	"lttr_15_year" numeric(5, 2),
	"perm_rating" numeric(5, 2),
	"thermal_u_value" numeric(8, 4),
	"stc_rating" integer,
	"iic_rating" integer,
	"nrc_rating" numeric(3, 2),
	"labor_units" numeric(5, 2),
	"cure_time_hours" integer,
	"weight_per_unit" numeric(8, 2),
	"slump_workability" varchar(50),
	"installation_difficulty" integer,
	"lead_time_days" integer,
	"otif_percentage" numeric(5, 2),
	"supplier_z_score" numeric(5, 2),
	"warranty_years" integer,
	"maintenance_cycle_years" integer,
	"expected_lifespan_years" integer,
	"data_source" varchar(100),
	"data_confidence" integer DEFAULT 50,
	"last_verified_at" timestamp,
	"verified_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"productName" varchar(255),
	"manufacturerId" integer,
	"category" varchar(100) NOT NULL,
	"subcategory" varchar(100),
	"description" text,
	"epdNumber" varchar(100),
	"epdUrl" text,
	"epdExpiry" timestamp,
	"epdProgramOperator" varchar(150),
	"gwpValue" numeric(12, 4),
	"gwpUnit" varchar(50),
	"declaredUnit" varchar(100),
	"msfFactor" numeric(10, 4),
	"embodiedCarbonPer1000sf" numeric(12, 2),
	"rValue" numeric(8, 2),
	"fireRating" varchar(50),
	"fireRatingStandard" varchar(100),
	"thermalUValue" numeric(8, 4),
	"vocLevel" varchar(50),
	"vocCertification" varchar(100),
	"onRedList" boolean DEFAULT false,
	"hasEpd" boolean DEFAULT false,
	"hasHpd" boolean DEFAULT false,
	"hasFsc" boolean DEFAULT false,
	"hasC2c" boolean DEFAULT false,
	"hasGreenguard" boolean DEFAULT false,
	"hasDeclare" boolean DEFAULT false,
	"recycledContentPct" numeric(5, 2),
	"leadTimeDays" integer,
	"usManufactured" boolean DEFAULT false,
	"regionalAvailabilityMiles" integer,
	"hasTakeBackProgram" boolean DEFAULT false,
	"pricePerUnit" numeric(10, 2),
	"priceUnit" varchar(50),
	"astmStandards" text,
	"meetsTitle24" boolean DEFAULT false,
	"meetsIecc" boolean DEFAULT false,
	"leedCredits" text,
	"expectedLifecycleYears" integer,
	"warrantyYears" integer,
	"dataSource" varchar(100),
	"verified" boolean DEFAULT false,
	"imageUrl" text,
	"specSheetUrl" text,
	"ec3Id" varchar(100),
	"ec3SyncedAt" timestamp,
	"ec3Category" varchar(100),
	"ec3ConservativeEstimate" varchar(50),
	"ec3BestPractice" varchar(50),
	"ec3IndustryMedian" varchar(50),
	"complianceGrade" "compliance_grade" DEFAULT 'C',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"messageId" integer NOT NULL,
	"userId" integer NOT NULL,
	"reactionType" varchar(20) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversationId" integer NOT NULL,
	"senderId" integer NOT NULL,
	"senderType" "message_sender_type" DEFAULT 'user' NOT NULL,
	"agentType" varchar(100),
	"content" text NOT NULL,
	"isRead" boolean DEFAULT false NOT NULL,
	"readAt" timestamp,
	"attachmentUrl" text,
	"attachmentType" varchar(50),
	"attachmentName" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_call_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"month" varchar(7) NOT NULL,
	"totalMinutes" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text,
	"relatedRfqId" integer,
	"relatedThreadId" integer,
	"isRead" boolean DEFAULT false,
	"readAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"material_id" integer NOT NULL,
	"price_per_unit" numeric(10, 2) NOT NULL,
	"unit" varchar(50) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD',
	"state" varchar(2),
	"city" varchar(100),
	"zip_code" varchar(10),
	"county" varchar(100),
	"source" varchar(50) NOT NULL,
	"source_date" timestamp,
	"source_url" text,
	"project_name" varchar(255),
	"contract_number" varchar(100),
	"labor_rate_per_hour" numeric(8, 2),
	"total_labor_cost" numeric(10, 2),
	"data_confidence" integer DEFAULT 50,
	"is_active" boolean DEFAULT true,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regional_swap_patterns" (
	"id" serial PRIMARY KEY NOT NULL,
	"state" varchar(2) NOT NULL,
	"original_material" varchar(255) NOT NULL,
	"alternative_material" varchar(255) NOT NULL,
	"approval_rate" numeric(5, 2) DEFAULT '0',
	"usage_count" integer DEFAULT 0,
	"avg_carbon_reduction" numeric(5, 2) DEFAULT '0',
	"avg_cost_delta" numeric(10, 2) DEFAULT '0',
	"avg_payback_years" numeric(5, 2) DEFAULT '0',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfq_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"rfqId" integer NOT NULL,
	"totalBidsReceived" integer DEFAULT 0,
	"avgBidPrice" numeric(12, 2),
	"lowestBidPrice" numeric(12, 2),
	"highestBidPrice" numeric(12, 2),
	"avgResponseTimeHours" numeric(5, 2),
	"winningBidId" integer,
	"purchasedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfq_bids" (
	"id" serial PRIMARY KEY NOT NULL,
	"rfqId" integer NOT NULL,
	"supplierId" integer NOT NULL,
	"status" "rfq_bid_status" DEFAULT 'submitted',
	"bidPrice" numeric(12, 2),
	"leadDays" integer,
	"notes" text,
	"expiresAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfq_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"rfqId" integer NOT NULL,
	"materialId" integer,
	"assemblyId" integer,
	"quantity" numeric(12, 2),
	"quantityUnit" varchar(50),
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfq_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"threadId" integer NOT NULL,
	"senderId" integer NOT NULL,
	"senderType" "sender_type" NOT NULL,
	"content" text NOT NULL,
	"isRead" boolean DEFAULT false,
	"readAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfq_threads" (
	"id" serial PRIMARY KEY NOT NULL,
	"rfqId" integer NOT NULL,
	"supplierId" integer NOT NULL,
	"buyerId" integer NOT NULL,
	"status" "rfq_thread_status" DEFAULT 'active',
	"lastMessageAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfqs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"projectName" varchar(255) NOT NULL,
	"projectLocation" varchar(255),
	"projectType" varchar(100),
	"status" "rfq_status" DEFAULT 'draft',
	"notes" text,
	"requiredCertifications" json,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"dueDate" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scraped_suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"email" varchar(320),
	"phone" varchar(50),
	"website" text,
	"address" text,
	"city" varchar(100),
	"state" varchar(2),
	"zip_code" varchar(10),
	"material_types" json DEFAULT '[]'::json,
	"source" varchar(100),
	"outreach_sent_at" timestamp,
	"outreach_rfq_id" integer,
	"email_status" varchar(50),
	"email_opens" integer DEFAULT 0,
	"email_clicks" integer DEFAULT 0,
	"email_bounced_at" timestamp,
	"last_engaged_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipping_costs" (
	"id" serial PRIMARY KEY NOT NULL,
	"origin_state" varchar(2) NOT NULL,
	"destination_state" varchar(2) NOT NULL,
	"material_type" varchar(100) NOT NULL,
	"cost_per_unit" numeric(10, 2) NOT NULL,
	"days_to_delivery" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"microsoftSubscriptionId" varchar(255) NOT NULL,
	"tier" "subscription_tier" DEFAULT 'free' NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"startDate" timestamp NOT NULL,
	"endDate" timestamp,
	"lastRenewalDate" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_microsoftSubscriptionId_unique" UNIQUE("microsoftSubscriptionId")
);
--> statement-breakpoint
CREATE TABLE "supplier_filters" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplierId" integer NOT NULL,
	"materialTypeId" integer,
	"minPrice" numeric(10, 2),
	"maxPrice" numeric(10, 2),
	"minLeadDays" integer,
	"maxLeadDays" integer,
	"serviceRadius" integer,
	"acceptedLocations" text,
	"materialTypePreferences" json,
	"minOrderQuantity" numeric(12, 2),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplierId" integer NOT NULL,
	"tier" "supplier_tier" DEFAULT 'free',
	"msSubscriptionId" varchar(255),
	"msPlanId" varchar(255),
	"status" "supplier_status" DEFAULT 'active',
	"renewalDate" timestamp,
	"isBeta" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"companyName" varchar(255) NOT NULL,
	"website" text,
	"logoUrl" text,
	"phone" varchar(50),
	"email" varchar(320) NOT NULL,
	"address" text,
	"city" varchar(100),
	"state" varchar(50),
	"zipCode" varchar(20),
	"country" varchar(100),
	"isPremium" boolean DEFAULT false,
	"premiumExpiresAt" timestamp,
	"sustainabilityScore" numeric(3, 2),
	"verified" boolean DEFAULT false,
	"verificationStatus" "verification_status" DEFAULT 'pending' NOT NULL,
	"verifiedAt" timestamp,
	"description" text,
	"location" varchar(255),
	"certifications" json,
	"maxOrderValue" numeric(12, 2),
	"currentCapacity" integer DEFAULT 100,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers_location" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"state" varchar(2) NOT NULL,
	"city" varchar(100) NOT NULL,
	"zip_code" varchar(10) NOT NULL,
	"latitude" numeric(10, 6) NOT NULL,
	"longitude" numeric(10, 6) NOT NULL,
	"materials_available" json DEFAULT '[]'::json,
	"carbon_score" numeric(5, 2) DEFAULT '0',
	"price_per_unit" numeric(10, 2),
	"lead_time_days" integer DEFAULT 7,
	"contact_email" varchar(255),
	"contact_phone" varchar(20),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "swap_validations" (
	"id" serial PRIMARY KEY NOT NULL,
	"incumbent_material_id" integer NOT NULL,
	"sustainable_material_id" integer NOT NULL,
	"project_id" integer,
	"validation_status" "swap_validation_status" NOT NULL,
	"overall_score" numeric(5, 2) NOT NULL,
	"showstopper_results" json NOT NULL,
	"passed_checks" integer NOT NULL,
	"failed_checks" integer NOT NULL,
	"skipped_checks" integer NOT NULL,
	"recommendation" text NOT NULL,
	"incumbent_total_cost" numeric(10, 2),
	"sustainable_total_cost" numeric(10, 2),
	"cost_delta_percentage" numeric(5, 2),
	"incumbent_gwp" numeric(10, 2),
	"sustainable_gwp" numeric(10, 2),
	"carbon_reduction_percentage" numeric(5, 2),
	"csi_form_url" text,
	"csi_form_generated_at" timestamp,
	"validated_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"requested_by" integer,
	"rfq_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"supplierId" integer,
	"dimension" "usage_dimension",
	"quantity" integer DEFAULT 0 NOT NULL,
	"videoMinutesUsed" integer DEFAULT 0,
	"messagesCount" integer DEFAULT 0,
	"periodStart" timestamp,
	"periodEnd" timestamp,
	"reportedToMs" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	"persona" "user_persona" DEFAULT 'default',
	"companyName" varchar(255),
	"jobTitle" varchar(255),
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "video_calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"callId" varchar(255) NOT NULL,
	"callerId" integer NOT NULL,
	"calleeId" integer NOT NULL,
	"conversationId" integer NOT NULL,
	"status" "video_call_status" DEFAULT 'initiated' NOT NULL,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"endedAt" timestamp,
	"durationSeconds" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "video_calls_callId_unique" UNIQUE("callId")
);
--> statement-breakpoint
CREATE INDEX "idx_assembly_comp_assembly" ON "assembly_spec_components" USING btree ("assembly_spec_id");--> statement-breakpoint
CREATE INDEX "idx_assembly_comp_material" ON "assembly_spec_components" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "idx_climate_zone" ON "climate_zone_adjustments" USING btree ("climate_zone");--> statement-breakpoint
CREATE INDEX "idx_climate_material" ON "climate_zone_adjustments" USING btree ("material_type");--> statement-breakpoint
CREATE INDEX "idx_compliance_rules_state" ON "compliance_rules" USING btree ("state");--> statement-breakpoint
CREATE INDEX "idx_compliance_rules_code" ON "compliance_rules" USING btree ("building_code");--> statement-breakpoint
CREATE INDEX "idx_loc_pricing_state" ON "location_pricing_adjustments" USING btree ("state");--> statement-breakpoint
CREATE INDEX "idx_loc_pricing_material" ON "location_pricing_adjustments" USING btree ("material_type");--> statement-breakpoint
CREATE INDEX "idx_assembly_specs_category" ON "material_assembly_specs" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_assembly_specs_ul" ON "material_assembly_specs" USING btree ("ul_design_number");--> statement-breakpoint
CREATE INDEX "idx_tech_specs_material" ON "material_technical_specs" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "idx_tech_specs_ul" ON "material_technical_specs" USING btree ("ul_listing");--> statement-breakpoint
CREATE INDEX "idx_tech_specs_icc_es" ON "material_technical_specs" USING btree ("icc_es_report");--> statement-breakpoint
CREATE INDEX "idx_pricing_material" ON "pricing_data" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "idx_pricing_state_data" ON "pricing_data" USING btree ("state");--> statement-breakpoint
CREATE INDEX "idx_pricing_source" ON "pricing_data" USING btree ("source");--> statement-breakpoint
CREATE INDEX "idx_pricing_active" ON "pricing_data" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_swap_patterns_state" ON "regional_swap_patterns" USING btree ("state");--> statement-breakpoint
CREATE INDEX "idx_swap_patterns_material" ON "regional_swap_patterns" USING btree ("original_material");--> statement-breakpoint
CREATE INDEX "idx_shipping_route" ON "shipping_costs" USING btree ("origin_state","destination_state");--> statement-breakpoint
CREATE INDEX "idx_shipping_material" ON "shipping_costs" USING btree ("material_type");--> statement-breakpoint
CREATE INDEX "idx_suppliers_location_state" ON "suppliers_location" USING btree ("state");--> statement-breakpoint
CREATE INDEX "idx_suppliers_location_city" ON "suppliers_location" USING btree ("city");--> statement-breakpoint
CREATE INDEX "idx_suppliers_location_latlng" ON "suppliers_location" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "idx_swap_incumbent" ON "swap_validations" USING btree ("incumbent_material_id");--> statement-breakpoint
CREATE INDEX "idx_swap_sustainable" ON "swap_validations" USING btree ("sustainable_material_id");--> statement-breakpoint
CREATE INDEX "idx_swap_status" ON "swap_validations" USING btree ("validation_status");--> statement-breakpoint
CREATE INDEX "idx_swap_rfq" ON "swap_validations" USING btree ("rfq_id");