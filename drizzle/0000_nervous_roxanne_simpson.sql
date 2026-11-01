CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`details` text NOT NULL,
	`created` text NOT NULL,
	`dataset` text DEFAULT 'live' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`location` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`dataset` text DEFAULT 'live' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `visit_status_history` (
	`id` text PRIMARY KEY NOT NULL,
	`visit_id` text NOT NULL,
	`actor` text NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`reason` text,
	`created` text NOT NULL,
	`dataset` text DEFAULT 'live' NOT NULL,
	FOREIGN KEY (`visit_id`) REFERENCES `visits`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `history_visit` ON `visit_status_history` (`visit_id`,`created`);--> statement-breakpoint
CREATE TABLE `hosts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`department_id` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`dataset` text DEFAULT 'live' NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `visitor_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`organisation` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`identity` text,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'visitor' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created` text NOT NULL,
	`dataset` text DEFAULT 'live' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_identity_unique` ON `users` (`identity`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `visits` (
	`id` text PRIMARY KEY NOT NULL,
	`reference` text NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`organisation` text NOT NULL,
	`purpose` text NOT NULL,
	`department_id` text NOT NULL,
	`host_id` text NOT NULL,
	`department_name` text NOT NULL,
	`host_name` text NOT NULL,
	`location` text NOT NULL,
	`visit_date` text NOT NULL,
	`arrival` text NOT NULL,
	`transport` text NOT NULL,
	`vehicle` text NOT NULL,
	`companions` integer DEFAULT 0 NOT NULL,
	`notes` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created` text NOT NULL,
	`approved_by` text,
	`approved_name` text,
	`approved_at` text,
	`rejected_at` text,
	`checkin_at` text,
	`checkout_at` text,
	`valid_from` text,
	`expires_at` text,
	`closing_at` text NOT NULL,
	`reason` text,
	`version` integer DEFAULT 0 NOT NULL,
	`last_event` text,
	`dataset` text DEFAULT 'live' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`host_id`) REFERENCES `hosts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `visits_reference_unique` ON `visits` (`reference`);--> statement-breakpoint
CREATE INDEX `visits_owner` ON `visits` (`user_id`,`created`);--> statement-breakpoint
CREATE INDEX `visits_status_date` ON `visits` (`status`,`visit_date`);