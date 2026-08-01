ALTER TABLE "rfqs" ALTER COLUMN "deposit_amount" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "manufacturers" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_agent_analytics_session" ON "agent_analytics" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_agent_conversations_user" ON "agent_conversations" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_agent_conversations_session" ON "agent_conversations" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_architect_download_events_architect" ON "architect_download_events" USING btree ("architect_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_architect_download_events_material" ON "architect_download_events" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_architect_referrals_referrer" ON "architect_referrals" USING btree ("referrer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_architect_referrals_referee" ON "architect_referrals" USING btree ("referee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_assembly_components_assembly" ON "assembly_components" USING btree ("assemblyId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_assembly_components_material" ON "assembly_components" USING btree ("materialId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_buyer_subscriptions_user" ON "buyer_subscriptions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_buyer_subscriptions_status" ON "buyer_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_call_history_conversation" ON "call_history" USING btree ("conversationId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_call_history_caller" ON "call_history" USING btree ("callerId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ccps_scores_material_persona" ON "ccps_scores" USING btree ("materialId","personaKey");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ccps_scores_material" ON "ccps_scores" USING btree ("materialId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_company_of_week_slots_supplier" ON "company_of_week_slots" USING btree ("supplierId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_company_of_week_slots_week" ON "company_of_week_slots" USING btree ("weekStartDate");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conversations_buyer" ON "conversations" USING btree ("buyerId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conversations_supplier" ON "conversations" USING btree ("supplierId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conversations_rfq" ON "conversations" USING btree ("rfqId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conversations_last_message_at" ON "conversations" USING btree ("lastMessageAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_legal_acceptances_user" ON "legal_acceptances" USING btree ("userId");--> statement-breakpoint
DELETE FROM "legal_acceptances" WHERE id NOT IN (SELECT DISTINCT ON ("userId","termsVersion","privacyVersion") id FROM "legal_acceptances" ORDER BY "userId","termsVersion","privacyVersion",id DESC);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_legal_acceptances_user_version" ON "legal_acceptances" USING btree ("userId","termsVersion","privacyVersion");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_manufacturers_claimed_by_user" ON "manufacturers" USING btree ("claimedByUserId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_manufacturers_category" ON "manufacturers" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_manufacturers_verified" ON "manufacturers" USING btree ("verified");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_material_certifications_material" ON "material_certifications" USING btree ("materialId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_material_specs_material" ON "material_specs" USING btree ("materialId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_material_specs_supplier" ON "material_specs" USING btree ("supplierId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_material_specs_submitted_by" ON "material_specs" USING btree ("submittedBy");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_material_specs_status" ON "material_specs" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_material_swaps_material" ON "material_swaps" USING btree ("materialId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_material_swaps_swap_material" ON "material_swaps" USING btree ("swapMaterialId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_message_reactions_message" ON "message_reactions" USING btree ("messageId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_message_reactions_user" ON "message_reactions" USING btree ("userId");--> statement-breakpoint
DELETE FROM "message_reactions" WHERE id NOT IN (SELECT DISTINCT ON ("messageId","userId","reactionType") id FROM "message_reactions" ORDER BY "messageId","userId","reactionType",id DESC);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_message_reactions_unique" ON "message_reactions" USING btree ("messageId","userId","reactionType");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_messages_conversation" ON "messages" USING btree ("conversationId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_messages_sender" ON "messages" USING btree ("senderId");--> statement-breakpoint
DELETE FROM "monthly_call_usage" WHERE id NOT IN (SELECT DISTINCT ON ("userId","month") id FROM "monthly_call_usage" ORDER BY "userId","month",id DESC);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_monthly_call_usage_user_month" ON "monthly_call_usage" USING btree ("userId","month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_monthly_call_usage_user" ON "monthly_call_usage" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_user" ON "notifications" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_is_read" ON "notifications" USING btree ("isRead");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rfq_analytics_rfq" ON "rfq_analytics" USING btree ("rfqId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rfq_analytics_winning_bid" ON "rfq_analytics" USING btree ("winningBidId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rfq_bids_rfq" ON "rfq_bids" USING btree ("rfqId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rfq_bids_supplier" ON "rfq_bids" USING btree ("supplierId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rfq_bids_status" ON "rfq_bids" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rfq_bids_rfq_supplier" ON "rfq_bids" USING btree ("rfqId","supplierId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rfq_items_rfq" ON "rfq_items" USING btree ("rfqId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rfq_items_material" ON "rfq_items" USING btree ("materialId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rfq_messages_thread" ON "rfq_messages" USING btree ("threadId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rfq_messages_sender" ON "rfq_messages" USING btree ("senderId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rfq_threads_rfq" ON "rfq_threads" USING btree ("rfqId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rfq_threads_supplier" ON "rfq_threads" USING btree ("supplierId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rfq_threads_buyer" ON "rfq_threads" USING btree ("buyerId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rfqs_user" ON "rfqs" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rfqs_status" ON "rfqs" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscriptions_user" ON "subscriptions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscriptions_status" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_supplier_filters_supplier" ON "supplier_filters" USING btree ("supplierId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_supplier_material_epds_supplier" ON "supplier_material_epds" USING btree ("supplierId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_supplier_material_epds_material" ON "supplier_material_epds" USING btree ("materialId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_supplier_material_epds_status" ON "supplier_material_epds" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_supplier_subscriptions_supplier" ON "supplier_subscriptions" USING btree ("supplierId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_supplier_subscriptions_status" ON "supplier_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_suppliers_user" ON "suppliers" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_suppliers_tier" ON "suppliers" USING btree ("tier");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_suppliers_verified" ON "suppliers" USING btree ("verified");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_usage_tracking_user" ON "usage_tracking" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_usage_tracking_supplier" ON "usage_tracking" USING btree ("supplierId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_usage_tracking_dimension" ON "usage_tracking" USING btree ("dimension");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_video_calls_conversation" ON "video_calls" USING btree ("conversationId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_video_calls_caller" ON "video_calls" USING btree ("callerId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_video_calls_callee" ON "video_calls" USING btree ("calleeId");