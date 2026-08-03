CREATE TABLE `video_calls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`callId` varchar(255) NOT NULL,
	`callerId` int NOT NULL,
	`calleeId` int NOT NULL,
	`conversationId` int NOT NULL,
	`status` enum('initiated','ringing','connected','ended','failed') NOT NULL DEFAULT 'initiated',
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	`durationSeconds` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `video_calls_id` PRIMARY KEY(`id`),
	CONSTRAINT `video_calls_callId_unique` UNIQUE(`callId`)
);
