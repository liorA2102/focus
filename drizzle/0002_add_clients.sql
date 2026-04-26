CREATE TABLE `clients` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `tagline` text,
  `industry` text,
  `website` text,
  `linkedin_url` text,
  `logo_path` text,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `client_contacts` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `client_id` integer NOT NULL,
  `name` text NOT NULL,
  `title` text,
  `email` text,
  `phone` text,
  `created_at` text NOT NULL,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `positions` ADD COLUMN `client_id` integer REFERENCES `clients`(`id`) ON DELETE set null;
