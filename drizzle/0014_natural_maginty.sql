CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`microsoftSubscriptionId` varchar(255) NOT NULL,
	`tier` enum('free','standard','premium') NOT NULL DEFAULT 'free',
	`status` enum('active','suspended','cancelled','expired') NOT NULL DEFAULT 'active',
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`lastRenewalDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptions_microsoftSubscriptionId_unique` UNIQUE(`microsoftSubscriptionId`)
);
