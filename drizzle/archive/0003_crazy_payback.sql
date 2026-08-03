CREATE TABLE `agent_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(255) NOT NULL,
	`agent` varchar(50) NOT NULL,
	`intentClassified` varchar(100),
	`confidence` decimal(3,2),
	`toolsUsed` text,
	`responseTimeMs` int,
	`escalated` tinyint DEFAULT 0,
	`handedOffToHuman` tinyint DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_analytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`sessionId` varchar(255) NOT NULL,
	`agent` varchar(50) NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_conversations_id` PRIMARY KEY(`id`)
);
