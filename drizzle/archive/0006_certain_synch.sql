CREATE TABLE `buyer_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tier` enum('free','standard','premium') DEFAULT 'free',
	`msSubscriptionId` varchar(255),
	`msPlanId` varchar(255),
	`status` enum('active','canceled','past_due','suspended','pending','trial') DEFAULT 'active',
	`trialEndsAt` timestamp,
	`renewalDate` timestamp,
	`isBeta` tinyint DEFAULT 0,
	`maxSeats` int DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `buyer_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `usage_tracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`supplierId` int,
	`dimension` enum('rfq_submission','ai_query','swap_analysis','ccps_export','material_comparison','supplier_match','message_thread','bid_submission') NOT NULL,
	`quantity` int NOT NULL DEFAULT 0,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`reportedToMs` tinyint DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `usage_tracking_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `supplier_subscriptions` MODIFY COLUMN `status` enum('active','canceled','past_due','suspended','pending') DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `supplier_subscriptions` ADD `msSubscriptionId` varchar(255);--> statement-breakpoint
ALTER TABLE `supplier_subscriptions` ADD `msPlanId` varchar(255);--> statement-breakpoint
ALTER TABLE `supplier_subscriptions` ADD `isBeta` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `supplier_subscriptions` DROP COLUMN `stripeSubscriptionId`;--> statement-breakpoint
ALTER TABLE `supplier_subscriptions` DROP COLUMN `stripeCustomerId`;