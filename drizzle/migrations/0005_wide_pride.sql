CREATE TABLE "process_pendencia_seen" (
	"user_id" uuid NOT NULL,
	"process_id" uuid NOT NULL,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "process_pendencia_seen_user_id_process_id_pk" PRIMARY KEY("user_id","process_id")
);
--> statement-breakpoint
ALTER TABLE "process_pendencia_seen" ADD CONSTRAINT "process_pendencia_seen_process_id_processes_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE cascade ON UPDATE no action;