-- Migration: 0004_concurrent_indexes
-- Non-transactional: run via `pnpm db:indexes` (scripts/run-concurrent-indexes.ts).
-- DO NOT run with drizzle-kit migrate or inside a psql transaction — CREATE INDEX
-- CONCURRENTLY is forbidden inside a transaction block.
--
-- Each statement is executed separately by the runner; no BEGIN/COMMIT wrapping.
-- Re-entrant: all statements use IF NOT EXISTS / CREATE UNIQUE INDEX IF NOT EXISTS.
--
-- IMPORTANT — Deduplication before unique indexes:
-- Each CREATE UNIQUE INDEX CONCURRENTLY statement is preceded by a DELETE that
-- removes duplicate rows, keeping only the row with the lowest id. This prevents
-- the index creation from failing with "could not create unique index" when
-- duplicates exist in production data. The DELETE statements are no-ops when
-- no duplicates are present.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_agent_analytics_session" ON "agent_analytics" USING btree ("sessionId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_agent_conversations_user" ON "agent_conversations" USING btree ("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_agent_conversations_session" ON "agent_conversations" USING btree ("sessionId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_architect_download_events_architect" ON "architect_download_events" USING btree ("architect_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_architect_download_events_material" ON "architect_download_events" USING btree ("material_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_architect_referrals_referrer" ON "architect_referrals" USING btree ("referrer_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_architect_referrals_referee" ON "architect_referrals" USING btree ("referee_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_assembly_components_assembly" ON "assembly_components" USING btree ("assemblyId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_assembly_components_material" ON "assembly_components" USING btree ("materialId");
DELETE FROM "buyer_subscriptions" a USING "buyer_subscriptions" b WHERE a.id > b.id AND a."userId" = b."userId";
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "idx_buyer_subscriptions_user" ON "buyer_subscriptions" USING btree ("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_buyer_subscriptions_status" ON "buyer_subscriptions" USING btree ("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_call_history_conversation" ON "call_history" USING btree ("conversationId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_call_history_caller" ON "call_history" USING btree ("callerId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_call_history_receiver" ON "call_history" USING btree ("receiverId");
DELETE FROM "ccps_scores" a USING "ccps_scores" b WHERE a.id > b.id AND a."materialId" = b."materialId" AND a."personaKey" = b."personaKey";
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "idx_ccps_scores_material_persona" ON "ccps_scores" USING btree ("materialId","personaKey");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_company_of_week_supplier" ON "company_of_week_slots" USING btree ("supplierId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_company_of_week_date" ON "company_of_week_slots" USING btree ("weekStartDate");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_conversations_buyer" ON "conversations" USING btree ("buyerId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_conversations_supplier" ON "conversations" USING btree ("supplierId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_conversations_rfq" ON "conversations" USING btree ("rfqId");
DELETE FROM "email_credentials" a USING "email_credentials" b WHERE a.id > b.id AND a."userId" = b."userId";
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "idx_email_credentials_user" ON "email_credentials" USING btree ("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_engagement_log_user" ON "engagement_log" USING btree ("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_engagement_log_action" ON "engagement_log" USING btree ("action");
DELETE FROM "legal_acceptances" a USING "legal_acceptances" b WHERE a.id > b.id AND a."userId" = b."userId";
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "idx_legal_acceptances_user" ON "legal_acceptances" USING btree ("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_manufacturers_claimed_by" ON "manufacturers" USING btree ("claimedByUserId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_manufacturers_category" ON "manufacturers" USING btree ("category");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_material_certifications_material" ON "material_certifications" USING btree ("materialId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_material_certifications_type" ON "material_certifications" USING btree ("certificationType");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_material_specs_material" ON "material_specs" USING btree ("materialId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_material_specs_supplier" ON "material_specs" USING btree ("supplierId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_material_specs_submitted_by" ON "material_specs" USING btree ("submittedBy");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_material_specs_status" ON "material_specs" USING btree ("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_material_swaps_material" ON "material_swaps" USING btree ("materialId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_material_swaps_swap_material" ON "material_swaps" USING btree ("swapMaterialId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_message_reactions_user" ON "message_reactions" USING btree ("userId");
DELETE FROM "message_reactions" a USING "message_reactions" b WHERE a.id > b.id AND a."messageId" = b."messageId" AND a."userId" = b."userId" AND a."reactionType" = b."reactionType";
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "idx_message_reactions_unique" ON "message_reactions" USING btree ("messageId","userId","reactionType");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_messages_conversation" ON "messages" USING btree ("conversationId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_messages_sender" ON "messages" USING btree ("senderId");
DELETE FROM "monthly_call_usage" a USING "monthly_call_usage" b WHERE a.id > b.id AND a."userId" = b."userId" AND a."month" = b."month";
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "idx_monthly_call_usage_user_month" ON "monthly_call_usage" USING btree ("userId","month");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_notifications_user_unread" ON "notifications" USING btree ("userId","isRead");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_referrals_referrer" ON "referrals" USING btree ("referrer_id");
DELETE FROM "rfq_analytics" a USING "rfq_analytics" b WHERE a.id > b.id AND a."rfqId" = b."rfqId";
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "idx_rfq_analytics_rfq" ON "rfq_analytics" USING btree ("rfqId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rfq_bids_supplier" ON "rfq_bids" USING btree ("supplierId");
DELETE FROM "rfq_bids" a USING "rfq_bids" b WHERE a.id > b.id AND a."rfqId" = b."rfqId" AND a."supplierId" = b."supplierId";
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "idx_rfq_bids_rfq_supplier" ON "rfq_bids" USING btree ("rfqId","supplierId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rfq_bids_status" ON "rfq_bids" USING btree ("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rfq_drafts_architect" ON "rfq_drafts" USING btree ("architect_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rfq_drafts_status" ON "rfq_drafts" USING btree ("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rfq_items_rfq" ON "rfq_items" USING btree ("rfqId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rfq_items_material" ON "rfq_items" USING btree ("materialId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rfq_items_assembly" ON "rfq_items" USING btree ("assemblyId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rfq_messages_thread" ON "rfq_messages" USING btree ("threadId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rfq_messages_sender" ON "rfq_messages" USING btree ("senderId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rfq_requests_architect" ON "rfq_requests" USING btree ("architect_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rfq_requests_supplier" ON "rfq_requests" USING btree ("supplier_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rfq_requests_material" ON "rfq_requests" USING btree ("material_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rfq_requests_draft" ON "rfq_requests" USING btree ("draft_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rfq_requests_status" ON "rfq_requests" USING btree ("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rfq_threads_rfq" ON "rfq_threads" USING btree ("rfqId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rfq_threads_supplier" ON "rfq_threads" USING btree ("supplierId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rfq_threads_buyer" ON "rfq_threads" USING btree ("buyerId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rfqs_user" ON "rfqs" USING btree ("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rfqs_status" ON "rfqs" USING btree ("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rfqs_created_at" ON "rfqs" USING btree ("createdAt" DESC NULLS LAST);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscriptions_user" ON "subscriptions" USING btree ("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscriptions_status" ON "subscriptions" USING btree ("status");
DELETE FROM "supplier_filters" a USING "supplier_filters" b WHERE a.id > b.id AND a."supplierId" = b."supplierId";
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "idx_supplier_filters_supplier" ON "supplier_filters" USING btree ("supplierId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_supplier_material_epds_supplier" ON "supplier_material_epds" USING btree ("supplierId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_supplier_material_epds_material" ON "supplier_material_epds" USING btree ("materialId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_supplier_material_epds_status" ON "supplier_material_epds" USING btree ("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_supplier_subscriptions_supplier" ON "supplier_subscriptions" USING btree ("supplierId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_supplier_subscriptions_status" ON "supplier_subscriptions" USING btree ("status");
DELETE FROM "suppliers" a USING "suppliers" b WHERE a.id > b.id AND a."userId" = b."userId";
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "idx_suppliers_user_id" ON "suppliers" USING btree ("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_suppliers_tier" ON "suppliers" USING btree ("tier");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_suppliers_verified" ON "suppliers" USING btree ("verified");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_suppliers_location_supplier" ON "suppliers_location" USING btree ("supplier_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_usage_tracking_user" ON "usage_tracking" USING btree ("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_usage_tracking_supplier" ON "usage_tracking" USING btree ("supplierId");
DELETE FROM "user_engagement" a USING "user_engagement" b WHERE a.id > b.id AND a."userId" = b."userId";
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "idx_user_engagement_user" ON "user_engagement" USING btree ("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_video_calls_caller" ON "video_calls" USING btree ("callerId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_video_calls_callee" ON "video_calls" USING btree ("calleeId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_video_calls_conversation" ON "video_calls" USING btree ("conversationId");

-- Indexes added from drizzle/0004_gray_silver_sable.sql (not previously in this runner)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_ccps_scores_material" ON "ccps_scores" USING btree ("materialId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_company_of_week_slots_supplier" ON "company_of_week_slots" USING btree ("supplierId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_company_of_week_slots_week" ON "company_of_week_slots" USING btree ("weekStartDate");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_conversations_last_message_at" ON "conversations" USING btree ("lastMessageAt");
DELETE FROM "legal_acceptances" a USING "legal_acceptances" b WHERE a.id > b.id AND a."userId" = b."userId" AND a."termsVersion" = b."termsVersion" AND a."privacyVersion" = b."privacyVersion";
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "idx_legal_acceptances_user_version" ON "legal_acceptances" USING btree ("userId","termsVersion","privacyVersion");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_manufacturers_verified" ON "manufacturers" USING btree ("verified");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_message_reactions_message" ON "message_reactions" USING btree ("messageId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_monthly_call_usage_user" ON "monthly_call_usage" USING btree ("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_notifications_user" ON "notifications" USING btree ("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_notifications_is_read" ON "notifications" USING btree ("isRead");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rfq_analytics_winning_bid" ON "rfq_analytics" USING btree ("winningBidId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rfq_bids_rfq" ON "rfq_bids" USING btree ("rfqId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_usage_tracking_dimension" ON "usage_tracking" USING btree ("dimension");