CREATE TABLE `call_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`callerId` int NOT NULL,
	`receiverId` int NOT NULL,
	`callType` enum('voice','video') NOT NULL,
	`status` enum('completed','missed','rejected','failed') NOT NULL,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp,
	`durationSeconds` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `call_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monthly_call_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`month` varchar(7) NOT NULL,
	`totalMinutes` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monthly_call_usage_id` PRIMARY KEY(`id`)
);
