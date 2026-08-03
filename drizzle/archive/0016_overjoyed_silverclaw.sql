CREATE TABLE `agent_handoff_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierId` int NOT NULL,
	`handoffMode` enum('always_agent','hybrid','immediate_human') NOT NULL DEFAULT 'hybrid',
	`maxAgentMessages` int NOT NULL DEFAULT 5,
	`businessHoursEnabled` tinyint NOT NULL DEFAULT 0,
	`businessHoursStart` varchar(5),
	`businessHoursEnd` varchar(5),
	`businessDays` varchar(50) DEFAULT 'Mon,Tue,Wed,Thu,Fri',
	`timezone` varchar(50) DEFAULT 'America/New_York',
	`customAgentPrompt` text,
	`autoDeflectEnabled` tinyint NOT NULL DEFAULT 1,
	`totalConversations` int NOT NULL DEFAULT 0,
	`agentResolutionRate` int NOT NULL DEFAULT 0,
	`avgMessagesBeforeHandoff` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_handoff_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `agent_handoff_rules_supplierId_unique` UNIQUE(`supplierId`)
);
--> statement-breakpoint
ALTER TABLE `conversations` ADD `agentMode` enum('agent_first','human_only','hybrid') DEFAULT 'agent_first' NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `handoffStatus` enum('agent','pending_handoff','human') DEFAULT 'agent' NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `agentMessageCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `handoffRequestedAt` timestamp;--> statement-breakpoint
ALTER TABLE `conversations` ADD `handoffReason` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `senderType` enum('user','agent','support') DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `agentType` varchar(100);