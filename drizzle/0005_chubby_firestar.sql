CREATE TABLE `material_swaps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`materialId` int NOT NULL,
	`swapMaterialId` int NOT NULL,
	`swapReason` text,
	`swapScore` int NOT NULL,
	`swapTier` enum('good','better','best') NOT NULL,
	`confidence` decimal(5,2) NOT NULL,
	`createdBy` enum('algorithm','agent','admin') NOT NULL,
	`usageCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `material_swaps_id` PRIMARY KEY(`id`)
);
