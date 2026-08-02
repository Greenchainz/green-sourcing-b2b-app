CREATE TABLE IF NOT EXISTS "email_sequences" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_email" varchar(320),
	"step" integer DEFAULT 1 NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "manufacturers" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
CREATE INDEX IF NOT EXISTS "idx_agent_conversations_user" ON "agent_conversations" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_agent_conversations_session" ON "agent_conversations" USING btree ("sessionId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_buyer_subscriptions_user" ON "buyer_subscriptions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_call_history_conversation" ON "call_history" USING btree ("conversationId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_call_history_caller" ON "call_history" USING btree ("callerId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_call_history_receiver" ON "call_history" USING btree ("receiverId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ccps_scores_material" ON "ccps_scores" USING btree ("materialId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ccps_scores_material_persona" ON "ccps_scores" USING btree ("materialId","personaKey");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conversations_buyer" ON "conversations" USING btree ("buyerId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conversations_supplier" ON "conversations" USING btree ("supplierId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conversations_rfq" ON "conversations" USING btree ("rfqId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_legal_acceptances_user" ON "legal_acceptances" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_material_certs_material" ON "material_certifications" USING btree ("materialId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_material_specs_material" ON "material_specs" USING btree ("materialId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_material_specs_supplier" ON "material_specs" USING btree ("supplierId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_material_specs_submitted_by" ON "material_specs" USING btree ("submittedBy");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_material_swaps_material" ON "material_swaps" USING btree ("materialId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_material_swaps_swap_material" ON "material_swaps" USING btree ("swapMaterialId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_materials_manufacturer" ON "materials" USING btree ("manufacturerId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_materials_category" ON "materials" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_materials_has_epd" ON "materials" USING btree ("hasEpd");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_message_reactions_message" ON "message_reactions" USING btree ("messageId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_message_reactions_user" ON "message_reactions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_messages_conversation" ON "messages" USING btree ("conversationId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_messages_sender" ON "messages" USING btree ("senderId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_monthly_call_usage_user" ON "monthly_call_usage" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_monthly_call_usage_user_month" ON "monthly_call_usage" USING btree ("userId","month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_user" ON "notifications" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_user_unread" ON "notifications" USING btree ("userId","isRead");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_rfq_analytics_rfq" ON "rfq_analytics" USING btree ("rfqId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rfq_bids_rfq" ON "rfq_bids" USING btree ("rfqId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rfq_bids_supplier" ON "rfq_bids" USING btree ("supplierId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_rfq_bids_rfq_supplier" ON "rfq_bids" USING btree ("rfqId","supplierId");--> statement-breakpoint
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
CREATE INDEX IF NOT EXISTS "idx_supplier_filters_supplier" ON "supplier_filters" USING btree ("supplierId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_supplier_subscriptions_supplier" ON "supplier_subscriptions" USING btree ("supplierId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_usage_tracking_user" ON "usage_tracking" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_usage_tracking_supplier" ON "usage_tracking" USING btree ("supplierId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_video_calls_caller" ON "video_calls" USING btree ("callerId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_video_calls_callee" ON "video_calls" USING btree ("calleeId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_video_calls_conversation" ON "video_calls" USING btree ("conversationId");