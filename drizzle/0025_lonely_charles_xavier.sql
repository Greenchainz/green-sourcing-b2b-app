CREATE TABLE `climate_zone_adjustments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`climate_zone` varchar(10) NOT NULL,
	`material_type` varchar(100) NOT NULL,
	`durability_multiplier` decimal(3,2) DEFAULT '1.0',
	`r_value_multiplier` decimal(3,2) DEFAULT '1.0',
	`carbon_impact_multiplier` decimal(3,2) DEFAULT '1.0',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `climate_zone_adjustments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `compliance_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`state` varchar(2) NOT NULL,
	`building_code` varchar(100) NOT NULL,
	`rule_name` varchar(255) NOT NULL,
	`rule_description` text,
	`applies_to_materials` json DEFAULT ('[]'),
	`compliance_type` varchar(50),
	`compliance_value` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `compliance_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `location_pricing_adjustments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`state` varchar(2) NOT NULL,
	`material_type` varchar(100) NOT NULL,
	`price_multiplier` decimal(3,2) DEFAULT '1.0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `location_pricing_adjustments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `regional_swap_patterns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`state` varchar(2) NOT NULL,
	`original_material` varchar(255) NOT NULL,
	`alternative_material` varchar(255) NOT NULL,
	`approval_rate` decimal(5,2) DEFAULT '0',
	`usage_count` int DEFAULT 0,
	`avg_carbon_reduction` decimal(5,2) DEFAULT '0',
	`avg_cost_delta` decimal(10,2) DEFAULT '0',
	`avg_payback_years` decimal(5,2) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `regional_swap_patterns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shipping_costs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`origin_state` varchar(2) NOT NULL,
	`destination_state` varchar(2) NOT NULL,
	`material_type` varchar(100) NOT NULL,
	`cost_per_unit` decimal(10,2) NOT NULL,
	`days_to_delivery` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shipping_costs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers_location` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplier_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`state` varchar(2) NOT NULL,
	`city` varchar(100) NOT NULL,
	`zip_code` varchar(10) NOT NULL,
	`latitude` decimal(10,6) NOT NULL,
	`longitude` decimal(10,6) NOT NULL,
	`materials_available` json DEFAULT ('[]'),
	`carbon_score` decimal(5,2) DEFAULT '0',
	`price_per_unit` decimal(10,2),
	`lead_time_days` int DEFAULT 7,
	`contact_email` varchar(255),
	`contact_phone` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suppliers_location_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_climate_zone` ON `climate_zone_adjustments` (`climate_zone`);--> statement-breakpoint
CREATE INDEX `idx_climate_material` ON `climate_zone_adjustments` (`material_type`);--> statement-breakpoint
CREATE INDEX `idx_compliance_rules_state` ON `compliance_rules` (`state`);--> statement-breakpoint
CREATE INDEX `idx_compliance_rules_code` ON `compliance_rules` (`building_code`);--> statement-breakpoint
CREATE INDEX `idx_pricing_state` ON `location_pricing_adjustments` (`state`);--> statement-breakpoint
CREATE INDEX `idx_pricing_material` ON `location_pricing_adjustments` (`material_type`);--> statement-breakpoint
CREATE INDEX `idx_swap_patterns_state` ON `regional_swap_patterns` (`state`);--> statement-breakpoint
CREATE INDEX `idx_swap_patterns_material` ON `regional_swap_patterns` (`original_material`);--> statement-breakpoint
CREATE INDEX `idx_shipping_route` ON `shipping_costs` (`origin_state`,`destination_state`);--> statement-breakpoint
CREATE INDEX `idx_shipping_material` ON `shipping_costs` (`material_type`);--> statement-breakpoint
CREATE INDEX `idx_suppliers_location_state` ON `suppliers_location` (`state`);--> statement-breakpoint
CREATE INDEX `idx_suppliers_location_city` ON `suppliers_location` (`city`);--> statement-breakpoint
CREATE INDEX `idx_suppliers_location_latlng` ON `suppliers_location` (`latitude`,`longitude`);