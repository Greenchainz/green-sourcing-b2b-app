ALTER TABLE `materials` ADD `ec3Id` varchar(100);--> statement-breakpoint
ALTER TABLE `materials` ADD `ec3SyncedAt` timestamp;--> statement-breakpoint
ALTER TABLE `materials` ADD `ec3Category` varchar(100);--> statement-breakpoint
ALTER TABLE `materials` ADD `ec3ConservativeEstimate` varchar(50);--> statement-breakpoint
ALTER TABLE `materials` ADD `ec3BestPractice` varchar(50);--> statement-breakpoint
ALTER TABLE `materials` ADD `ec3IndustryMedian` varchar(50);