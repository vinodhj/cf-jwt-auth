CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
