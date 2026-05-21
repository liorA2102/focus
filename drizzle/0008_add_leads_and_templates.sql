CREATE TABLE `comment_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`image_filename` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`headline` text,
	`company` text,
	`linkedin_url` text NOT NULL,
	`profile_picture_url` text,
	`post_url` text,
	`template_used` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
