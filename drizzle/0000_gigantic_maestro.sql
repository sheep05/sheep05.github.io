CREATE TABLE `album_photos` (
	`album_id` text NOT NULL,
	`photo_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`album_id`, `photo_id`),
	FOREIGN KEY (`album_id`) REFERENCES `albums`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`photo_id`) REFERENCES `photos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `albums` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`published` integer DEFAULT 0 NOT NULL,
	`cover_id` text
);
--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`caption` text DEFAULT '' NOT NULL,
	`alt` text DEFAULT '' NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`key` text NOT NULL,
	`thumb_key` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `studio` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text,
	`name` text NOT NULL,
	`tagline` text NOT NULL,
	`bio` text NOT NULL,
	`email` text NOT NULL,
	`show_samples` integer DEFAULT 1 NOT NULL
);
