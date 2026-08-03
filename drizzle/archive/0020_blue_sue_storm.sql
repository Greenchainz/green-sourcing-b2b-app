ALTER TABLE `suppliers` ADD `verificationStatus` enum('pending','approved','rejected') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `verifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `description` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `location` varchar(255);