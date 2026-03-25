CREATE TABLE `sync_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source` varchar(50) NOT NULL,
	`status` enum('running','success','error') NOT NULL,
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` timestamp,
	`records_imported` int DEFAULT 0,
	`records_updated` int DEFAULT 0,
	`error_count` int DEFAULT 0,
	`error_message` text,
	CONSTRAINT `sync_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `parliamentarians` ADD `external_id` varchar(128);--> statement-breakpoint
ALTER TABLE `parliamentarians` ADD CONSTRAINT `parliamentarians_external_id_unique` UNIQUE(`external_id`);