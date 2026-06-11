CREATE TABLE "process_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"process_id" uuid NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "processes" ADD COLUMN "classe_impacto" text;--> statement-breakpoint
ALTER TABLE "processes" ADD COLUMN "tempo_tramitacao" text;--> statement-breakpoint
ALTER TABLE "processes" ADD COLUMN "atividade_licenciada" text;--> statement-breakpoint
ALTER TABLE "process_documents" ADD CONSTRAINT "process_documents_process_id_processes_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "process_documents_process_id_idx" ON "process_documents" USING btree ("process_id");