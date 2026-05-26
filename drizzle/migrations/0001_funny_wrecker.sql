ALTER TABLE "contact_submissions" ADD COLUMN "source" text DEFAULT 'marketing_site' NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_submissions" ADD COLUMN "user_agent" text;