CREATE TABLE `assemblies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(50),
	`assemblyType` varchar(100) NOT NULL,
	`description` text,
	`sustainabilityTier` enum('good','better','best') DEFAULT 'good',
	`totalGwpPer1000Sqft` decimal(12,2),
	`totalRValue` decimal(8,2),
	`estimatedCostPer1000Sqft` decimal(10,2),
	`fireRating` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assemblies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assembly_components` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assemblyId` int NOT NULL,
	`materialId` int,
	`layerOrder` int NOT NULL,
	`layerName` varchar(255) NOT NULL,
	`thickness` varchar(50),
	`gwpContribution` decimal(12,4),
	`notes` text,
	CONSTRAINT `assembly_components_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ccps_baselines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` varchar(100) NOT NULL,
	`baselineGwpPerUnit` decimal(12,4),
	`baselinePricePerUnit` decimal(10,2),
	`baselineLeadTimeDays` int,
	`baselineRecycledPct` decimal(5,2),
	`sampleSize` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ccps_baselines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ccps_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`materialId` int NOT NULL,
	`personaKey` varchar(50) NOT NULL,
	`carbonScore` int,
	`complianceScore` int,
	`certificationScore` int,
	`costScore` int,
	`supplyChainScore` int,
	`healthScore` int,
	`ccpsTotal` int,
	`sourcingDifficulty` int,
	`calculatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ccps_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `decision_maker_personas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`personaKey` varchar(50) NOT NULL,
	`title` varchar(100) NOT NULL,
	`description` text,
	`carbonWeight` decimal(4,2),
	`complianceWeight` decimal(4,2),
	`certificationWeight` decimal(4,2),
	`costWeight` decimal(4,2),
	`supplyChainWeight` decimal(4,2),
	`healthWeight` decimal(4,2),
	CONSTRAINT `decision_maker_personas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(255),
	`company` varchar(255),
	`source` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `manufacturers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`website` text,
	`logoUrl` text,
	`phone` varchar(50),
	`email` varchar(320),
	`headquarters` varchar(255),
	`sustainabilityPageUrl` text,
	`verified` tinyint DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `manufacturers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `material_certifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`materialId` int NOT NULL,
	`certificationType` varchar(100) NOT NULL,
	`certificationName` varchar(255),
	`certificationNumber` varchar(100),
	`issuingBody` varchar(255),
	`issueDate` timestamp,
	`expirationDate` timestamp,
	`certificationUrl` text,
	`leedCreditCategory` varchar(100),
	`leedCreditNumber` varchar(50),
	`leedPointsValue` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `material_certifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `materials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`productName` varchar(255),
	`manufacturerId` int,
	`category` varchar(100) NOT NULL,
	`subcategory` varchar(100),
	`description` text,
	`epdNumber` varchar(100),
	`epdUrl` text,
	`epdExpiry` timestamp,
	`epdProgramOperator` varchar(150),
	`gwpValue` decimal(12,4),
	`gwpUnit` varchar(50),
	`declaredUnit` varchar(100),
	`msfFactor` decimal(10,4),
	`embodiedCarbonPer1000sf` decimal(12,2),
	`rValue` decimal(8,2),
	`fireRating` varchar(50),
	`fireRatingStandard` varchar(100),
	`thermalUValue` decimal(8,4),
	`vocLevel` varchar(50),
	`vocCertification` varchar(100),
	`onRedList` tinyint DEFAULT 0,
	`hasEpd` tinyint DEFAULT 0,
	`hasHpd` tinyint DEFAULT 0,
	`hasFsc` tinyint DEFAULT 0,
	`hasC2c` tinyint DEFAULT 0,
	`hasGreenguard` tinyint DEFAULT 0,
	`hasDeclare` tinyint DEFAULT 0,
	`recycledContentPct` decimal(5,2),
	`leadTimeDays` int,
	`usManufactured` tinyint DEFAULT 0,
	`regionalAvailabilityMiles` int,
	`hasTakeBackProgram` tinyint DEFAULT 0,
	`pricePerUnit` decimal(10,2),
	`priceUnit` varchar(50),
	`astmStandards` text,
	`meetsTitle24` tinyint DEFAULT 0,
	`meetsIecc` tinyint DEFAULT 0,
	`leedCredits` text,
	`expectedLifecycleYears` int,
	`warrantyYears` int,
	`dataSource` varchar(100),
	`verified` tinyint DEFAULT 0,
	`imageUrl` text,
	`specSheetUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `materials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rfq_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rfqId` int NOT NULL,
	`materialId` int,
	`assemblyId` int,
	`quantity` decimal(12,2),
	`quantityUnit` varchar(50),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rfq_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rfqs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`projectName` varchar(255) NOT NULL,
	`projectLocation` varchar(255),
	`projectType` varchar(100),
	`status` enum('draft','submitted','responded','awarded','closed') DEFAULT 'draft',
	`notes` text,
	`dueDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rfqs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `persona` enum('architect','leed_ap','gc_pm','spec_writer','owner','facility_manager','default') DEFAULT 'default';--> statement-breakpoint
ALTER TABLE `users` ADD `companyName` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `jobTitle` varchar(255);