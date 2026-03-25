CREATE TABLE `assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parliamentarian_id` int NOT NULL,
	`declaration_year` int NOT NULL,
	`asset_type` varchar(100),
	`description` text,
	`value` decimal(15,2) NOT NULL,
	`total_declared` decimal(15,2),
	`source` enum('tse','tcu','manual') DEFAULT 'tse',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parliamentarian_id` int NOT NULL,
	`report_type` enum('full','ghost_employees','assets','contracts','summary') NOT NULL,
	`title` varchar(255) NOT NULL,
	`narrative` text NOT NULL,
	`key_findings` json,
	`priority_areas` json,
	`risk_level` enum('low','medium','high','critical') DEFAULT 'low',
	`generated_by` enum('llm','manual') DEFAULT 'llm',
	`generated_at` timestamp NOT NULL DEFAULT (now()),
	`requested_by_user_id` int,
	CONSTRAINT `audit_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parliamentarian_id` int NOT NULL,
	`contract_number` varchar(100),
	`contracting_entity` varchar(255),
	`contractor_name` varchar(255) NOT NULL,
	`contractor_cnpj` varchar(18),
	`object_description` text,
	`value` decimal(15,2) NOT NULL,
	`start_date` timestamp,
	`end_date` timestamp,
	`is_shell_company` boolean DEFAULT false,
	`has_parliamentarian_link` boolean DEFAULT false,
	`link_description` text,
	`risk_level` enum('low','medium','high','critical') DEFAULT 'low',
	`source` enum('tcu','camara','senado','manual') DEFAULT 'manual',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contracts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parliamentarian_id` int NOT NULL,
	`cpf` varchar(14),
	`name` varchar(255) NOT NULL,
	`role_title` varchar(100),
	`salary` decimal(15,2),
	`hire_date` timestamp,
	`termination_date` timestamp,
	`attendance_rate` float,
	`is_ghost_suspect` boolean DEFAULT false,
	`ghost_reason` text,
	`multiple_employers` boolean DEFAULT false,
	`source` enum('camara','senado','manual') DEFAULT 'manual',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `employees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parliamentarian_id` int NOT NULL,
	`source` enum('camara','senado','tse','tcu','manual') NOT NULL,
	`category` varchar(100),
	`description` text,
	`supplier_name` varchar(255),
	`supplier_cnpj` varchar(18),
	`amount` decimal(15,2) NOT NULL,
	`expense_date` timestamp NOT NULL,
	`document_number` varchar(100),
	`is_suspicious` boolean DEFAULT false,
	`suspicion_reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `parliamentarians` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cpf` varchar(14) NOT NULL,
	`name` varchar(255) NOT NULL,
	`party` varchar(50),
	`state` varchar(2),
	`role` enum('deputado_federal','senador','vereador','governador','prefeito','candidato') NOT NULL,
	`mandate_start` timestamp,
	`mandate_end` timestamp,
	`declared_income_monthly` decimal(15,2),
	`photo_url` text,
	`bio` text,
	`source_tse` boolean DEFAULT false,
	`source_camara` boolean DEFAULT false,
	`source_senado` boolean DEFAULT false,
	`tse_candidate_id` varchar(64),
	`camara_deputy_id` varchar(64),
	`senado_senator_id` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `parliamentarians_id` PRIMARY KEY(`id`),
	CONSTRAINT `parliamentarians_cpf_unique` UNIQUE(`cpf`)
);
--> statement-breakpoint
CREATE TABLE `search_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`query` varchar(255) NOT NULL,
	`query_type` enum('cpf','name') DEFAULT 'cpf',
	`result_count` int DEFAULT 0,
	`searched_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `search_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trust_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parliamentarian_id` int NOT NULL,
	`overall_score` float NOT NULL,
	`transparency_score` float NOT NULL,
	`asset_consistency_score` float NOT NULL,
	`expense_regularity_score` float NOT NULL,
	`irregularity_score` float NOT NULL,
	`ghost_employee_count` int DEFAULT 0,
	`suspicious_contract_count` int DEFAULT 0,
	`asset_discrepancy_value` decimal(15,2),
	`analysis_details` json,
	`calculated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trust_scores_id` PRIMARY KEY(`id`)
);
