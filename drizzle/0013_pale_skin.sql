ALTER TABLE `usage_tracking` MODIFY COLUMN `dimension` enum('rfq_submission','ai_query','swap_analysis','ccps_export','material_comparison','supplier_match','message_thread','bid_submission','video_call','message_sent');--> statement-breakpoint
ALTER TABLE `usage_tracking` MODIFY COLUMN `periodStart` timestamp;--> statement-breakpoint
ALTER TABLE `usage_tracking` MODIFY COLUMN `periodEnd` timestamp;--> statement-breakpoint
ALTER TABLE `usage_tracking` ADD `videoMinutesUsed` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `usage_tracking` ADD `messagesCount` int DEFAULT 0;