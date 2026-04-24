CREATE TABLE `candidate_matches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`candidate_id` integer NOT NULL,
	`position_id` integer NOT NULL,
	`strength` text NOT NULL,
	`explanation` text,
	`client_requested` integer DEFAULT false,
	`hired` integer DEFAULT false,
	`rejected` integer DEFAULT false,
	`created_at` text NOT NULL,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`position_id`) REFERENCES `positions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `candidates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`full_name` text NOT NULL,
	`email` text,
	`phone` text,
	`current_title` text,
	`years_experience` integer,
	`skills` text,
	`industries` text,
	`location` text,
	`summary` text,
	`cv_path` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `linkedin_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`content` text NOT NULL,
	`image_url` text,
	`position_id` integer,
	`linkedin_url` text,
	`posted_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`position_id`) REFERENCES `positions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `positions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`client` text NOT NULL,
	`location` text,
	`salary_range` text,
	`description` text,
	`requirements` text,
	`status` text DEFAULT 'open' NOT NULL,
	`posted_job_master` integer DEFAULT false,
	`posted_linkedin` integer DEFAULT false,
	`linkedin_post_url` text,
	`job_master_posted_at` text,
	`linkedin_posted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
