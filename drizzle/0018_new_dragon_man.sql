CREATE TABLE `message_reactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageId` int NOT NULL,
	`userId` int NOT NULL,
	`reactionType` varchar(20) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `message_reactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `conversations` ADD `lastMessage` text;--> statement-breakpoint
ALTER TABLE `conversations` ADD `isPinned` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `isArchived` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `label` varchar(50);--> statement-breakpoint
ALTER TABLE `conversations` ADD `labelColor` varchar(20);--> statement-breakpoint
ALTER TABLE `messages` ADD `readAt` timestamp;--> statement-breakpoint
ALTER TABLE `messages` ADD `attachmentUrl` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `attachmentType` varchar(50);--> statement-breakpoint
ALTER TABLE `messages` ADD `attachmentName` varchar(255);