CREATE TABLE `legal_acceptances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`termsAccepted` tinyint NOT NULL DEFAULT 0,
	`termsAcceptedAt` timestamp,
	`termsVersion` varchar(50) DEFAULT '1.0',
	`privacyAccepted` tinyint NOT NULL DEFAULT 0,
	`privacyAcceptedAt` timestamp,
	`privacyVersion` varchar(50) DEFAULT '1.0',
	`cookieConsentGiven` tinyint NOT NULL DEFAULT 0,
	`cookieConsentAt` timestamp,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `legal_acceptances_id` PRIMARY KEY(`id`)
);
