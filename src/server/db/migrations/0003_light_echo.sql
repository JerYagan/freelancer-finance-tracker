CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"client_id" uuid NOT NULL,
	"project_id" uuid,
	"category_id" uuid,
	"number" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	"issued_on" date NOT NULL,
	"due_on" date NOT NULL,
	"paid_on" date,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_amount_minor_check" CHECK ("invoices"."amount_minor" > 0),
	CONSTRAINT "invoices_due_date_check" CHECK ("invoices"."due_on" >= "invoices"."issued_on")
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_user_number_unique_idx" ON "invoices" USING btree ("user_id",lower("number"));--> statement-breakpoint
CREATE INDEX "invoices_user_status_idx" ON "invoices" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "invoices_user_client_idx" ON "invoices" USING btree ("user_id","client_id");--> statement-breakpoint
CREATE INDEX "invoices_user_due_on_idx" ON "invoices" USING btree ("user_id","due_on" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;