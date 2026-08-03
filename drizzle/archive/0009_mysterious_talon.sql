ALTER TABLE `rfqs` ADD `requiredCertifications` json;--> statement-breakpoint
ALTER TABLE `supplier_filters` ADD `materialTypePreferences` json;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `certifications` json;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `maxOrderValue` decimal(12,2);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `currentCapacity` int DEFAULT 100;