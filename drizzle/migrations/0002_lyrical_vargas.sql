CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'overdue');--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"process_id" uuid NOT NULL,
	"installment_no" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"due_date" date NOT NULL,
	"paid_at" timestamp with time zone,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "processes" ALTER COLUMN "latitude" SET DATA TYPE numeric(10, 7);--> statement-breakpoint
ALTER TABLE "processes" ALTER COLUMN "longitude" SET DATA TYPE numeric(10, 7);--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "responsible_tech_id" uuid;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "contact_name" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "contact_role" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "contact_email" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "contact_phone" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "address_street" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "address_city" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "address_state" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "address_postal_code" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "read_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_process_id_processes_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payments_process_installment_uniq" ON "payments" USING btree ("process_id","installment_no");--> statement-breakpoint
CREATE INDEX "payments_status_due_date_idx" ON "payments" USING btree ("status","due_date");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_responsible_tech_id_responsible_techs_id_fk" FOREIGN KEY ("responsible_tech_id") REFERENCES "public"."responsible_techs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "appointments_tech_slot_uniq" ON "appointments" USING btree ("responsible_tech_id","starts_at") WHERE status <> 'cancelada' AND responsible_tech_id IS NOT NULL;