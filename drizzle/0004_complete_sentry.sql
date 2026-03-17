CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('rfq_match','new_message','bid_accepted','bid_rejected','rfq_closed') NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text,
	`relatedRfqId` int,
	`relatedThreadId` int,
	`isRead` tinyint DEFAULT 0,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rfq_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rfqId` int NOT NULL,
	`totalBidsReceived` int DEFAULT 0,
	`avgBidPrice` decimal(12,2),
	`lowestBidPrice` decimal(12,2),
	`highestBidPrice` decimal(12,2),
	`avgResponseTimeHours` decimal(5,2),
	`winningBidId` int,
	`purchasedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rfq_analytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rfq_bids` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rfqId` int NOT NULL,
	`supplierId` int NOT NULL,
	`status` enum('submitted','accepted','rejected','expired') DEFAULT 'submitted',
	`bidPrice` decimal(12,2),
	`leadDays` int,
	`notes` text,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rfq_bids_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rfq_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`threadId` int NOT NULL,
	`senderId` int NOT NULL,
	`senderType` enum('buyer','supplier') NOT NULL,
	`content` text NOT NULL,
	`isRead` tinyint DEFAULT 0,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rfq_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rfq_threads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rfqId` int NOT NULL,
	`supplierId` int NOT NULL,
	`buyerId` int NOT NULL,
	`status` enum('active','closed','archived') DEFAULT 'active',
	`lastMessageAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rfq_threads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplier_filters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierId` int NOT NULL,
	`materialTypeId` int,
	`minPrice` decimal(10,2),
	`maxPrice` decimal(10,2),
	`minLeadDays` int,
	`maxLeadDays` int,
	`serviceRadius` int,
	`acceptedLocations` text,
	`minOrderQuantity` decimal(12,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplier_filters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplier_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierId` int NOT NULL,
	`tier` enum('free','premium') DEFAULT 'free',
	`stripeSubscriptionId` varchar(255),
	`stripeCustomerId` varchar(255),
	`status` enum('active','canceled','past_due') DEFAULT 'active',
	`renewalDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplier_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`companyName` varchar(255) NOT NULL,
	`website` text,
	`logoUrl` text,
	`phone` varchar(50),
	`email` varchar(320) NOT NULL,
	`address` text,
	`city` varchar(100),
	`state` varchar(50),
	`zipCode` varchar(20),
	`country` varchar(100),
	`isPremium` tinyint DEFAULT 0,
	`premiumExpiresAt` timestamp,
	`sustainabilityScore` decimal(3,2),
	`verified` tinyint DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);
