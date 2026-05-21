ALTER TABLE `candidates` ADD `updated_at` text;
--> statement-breakpoint
UPDATE `candidates` SET `updated_at` = `created_at` WHERE `updated_at` IS NULL;
