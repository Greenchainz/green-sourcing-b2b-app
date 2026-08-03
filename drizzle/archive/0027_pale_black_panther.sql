ALTER TABLE `swap_validations` ADD `project_id` int;--> statement-breakpoint
ALTER TABLE `swap_validations` ADD `overall_score` decimal(5,2) NOT NULL;--> statement-breakpoint
ALTER TABLE `swap_validations` ADD `showstopper_results` json NOT NULL;--> statement-breakpoint
ALTER TABLE `swap_validations` ADD `passed_checks` int NOT NULL;--> statement-breakpoint
ALTER TABLE `swap_validations` ADD `failed_checks` int NOT NULL;--> statement-breakpoint
ALTER TABLE `swap_validations` ADD `skipped_checks` int NOT NULL;--> statement-breakpoint
ALTER TABLE `swap_validations` ADD `recommendation` text NOT NULL;--> statement-breakpoint
ALTER TABLE `swap_validations` ADD `validated_at` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `swap_validations` ADD `expires_at` timestamp;--> statement-breakpoint
ALTER TABLE `swap_validations` DROP COLUMN `is_valid_swap`;--> statement-breakpoint
ALTER TABLE `swap_validations` DROP COLUMN `astm_match`;--> statement-breakpoint
ALTER TABLE `swap_validations` DROP COLUMN `fire_rating_match`;--> statement-breakpoint
ALTER TABLE `swap_validations` DROP COLUMN `ul_listing_match`;--> statement-breakpoint
ALTER TABLE `swap_validations` DROP COLUMN `strength_adequate`;--> statement-breakpoint
ALTER TABLE `swap_validations` DROP COLUMN `r_value_adequate`;--> statement-breakpoint
ALTER TABLE `swap_validations` DROP COLUMN `stc_adequate`;--> statement-breakpoint
ALTER TABLE `swap_validations` DROP COLUMN `warnings`;--> statement-breakpoint
ALTER TABLE `swap_validations` DROP COLUMN `project_state`;--> statement-breakpoint
ALTER TABLE `swap_validations` DROP COLUMN `project_city`;--> statement-breakpoint
ALTER TABLE `swap_validations` DROP COLUMN `project_type`;