CREATE TABLE `assembly_spec_components` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assembly_spec_id` int NOT NULL,
	`material_id` int NOT NULL,
	`layer_order` int NOT NULL,
	`layer_name` varchar(255) NOT NULL,
	`quantity` decimal(8,2) NOT NULL,
	`unit` varchar(50) NOT NULL,
	`thickness_inches` decimal(5,2),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assembly_spec_components_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `material_assembly_specs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(100) NOT NULL,
	`description` text,
	`total_thickness_inches` decimal(5,2),
	`total_r_value` decimal(5,2),
	`fire_rating` varchar(50),
	`ul_design_number` varchar(50),
	`stc_rating` int,
	`iic_rating` int,
	`total_cost_per_sf` decimal(10,2),
	`total_gwp_per_sf` decimal(10,2),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `material_assembly_specs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `material_technical_specs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`material_id` int NOT NULL,
	`astm_codes` json DEFAULT ('[]'),
	`ul_listing` varchar(255),
	`ul_design_number` varchar(50),
	`icc_es_report` varchar(50),
	`fire_rating` varchar(50),
	`fire_rating_standard` varchar(100),
	`char_rate` varchar(50),
	`compressive_strength_psi` int,
	`modulus_of_elasticity_ksi` int,
	`flexural_strength_psi` int,
	`tensile_strength_psi` int,
	`stiffness_ksi` int,
	`r_value_per_inch` decimal(5,2),
	`lttr_15_year` decimal(5,2),
	`perm_rating` decimal(5,2),
	`thermal_u_value` decimal(8,4),
	`stc_rating` int,
	`iic_rating` int,
	`nrc_rating` decimal(3,2),
	`labor_units` decimal(5,2),
	`cure_time_hours` int,
	`weight_per_unit` decimal(8,2),
	`slump_workability` varchar(50),
	`installation_difficulty` int,
	`lead_time_days` int,
	`otif_percentage` decimal(5,2),
	`supplier_z_score` decimal(5,2),
	`warranty_years` int,
	`maintenance_cycle_years` int,
	`expected_lifespan_years` int,
	`data_source` varchar(100),
	`data_confidence` int DEFAULT 50,
	`last_verified_at` timestamp,
	`verified_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `material_technical_specs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pricing_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`material_id` int NOT NULL,
	`price_per_unit` decimal(10,2) NOT NULL,
	`unit` varchar(50) NOT NULL,
	`currency` varchar(3) DEFAULT 'USD',
	`state` varchar(2),
	`city` varchar(100),
	`zip_code` varchar(10),
	`county` varchar(100),
	`source` varchar(50) NOT NULL,
	`source_date` timestamp,
	`source_url` text,
	`project_name` varchar(255),
	`contract_number` varchar(100),
	`labor_rate_per_hour` decimal(8,2),
	`total_labor_cost` decimal(10,2),
	`data_confidence` int DEFAULT 50,
	`is_active` boolean DEFAULT true,
	`expires_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pricing_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `swap_validations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`incumbent_material_id` int NOT NULL,
	`sustainable_material_id` int NOT NULL,
	`is_valid_swap` boolean NOT NULL,
	`validation_status` enum('APPROVED','EXPERIMENTAL','REJECTED') NOT NULL,
	`astm_match` boolean NOT NULL,
	`fire_rating_match` boolean NOT NULL,
	`ul_listing_match` boolean NOT NULL,
	`strength_adequate` boolean NOT NULL,
	`r_value_adequate` boolean NOT NULL,
	`stc_adequate` boolean NOT NULL,
	`warnings` json DEFAULT ('[]'),
	`incumbent_total_cost` decimal(10,2),
	`sustainable_total_cost` decimal(10,2),
	`cost_delta_percentage` decimal(5,2),
	`incumbent_gwp` decimal(10,2),
	`sustainable_gwp` decimal(10,2),
	`carbon_reduction_percentage` decimal(5,2),
	`project_state` varchar(2),
	`project_city` varchar(100),
	`project_type` varchar(100),
	`csi_form_url` text,
	`csi_form_generated_at` timestamp,
	`requested_by` int,
	`rfq_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `swap_validations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_assembly_comp_assembly` ON `assembly_spec_components` (`assembly_spec_id`);--> statement-breakpoint
CREATE INDEX `idx_assembly_comp_material` ON `assembly_spec_components` (`material_id`);--> statement-breakpoint
CREATE INDEX `idx_assembly_specs_category` ON `material_assembly_specs` (`category`);--> statement-breakpoint
CREATE INDEX `idx_assembly_specs_ul` ON `material_assembly_specs` (`ul_design_number`);--> statement-breakpoint
CREATE INDEX `idx_tech_specs_material` ON `material_technical_specs` (`material_id`);--> statement-breakpoint
CREATE INDEX `idx_tech_specs_ul` ON `material_technical_specs` (`ul_listing`);--> statement-breakpoint
CREATE INDEX `idx_tech_specs_icc_es` ON `material_technical_specs` (`icc_es_report`);--> statement-breakpoint
CREATE INDEX `idx_pricing_material` ON `pricing_data` (`material_id`);--> statement-breakpoint
CREATE INDEX `idx_pricing_state` ON `pricing_data` (`state`);--> statement-breakpoint
CREATE INDEX `idx_pricing_source` ON `pricing_data` (`source`);--> statement-breakpoint
CREATE INDEX `idx_pricing_active` ON `pricing_data` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_swap_incumbent` ON `swap_validations` (`incumbent_material_id`);--> statement-breakpoint
CREATE INDEX `idx_swap_sustainable` ON `swap_validations` (`sustainable_material_id`);--> statement-breakpoint
CREATE INDEX `idx_swap_status` ON `swap_validations` (`validation_status`);--> statement-breakpoint
CREATE INDEX `idx_swap_rfq` ON `swap_validations` (`rfq_id`);