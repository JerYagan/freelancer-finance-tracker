CREATE TABLE "recurring_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"interval" "recurrence_interval" NOT NULL,
	"next_run_on" date NOT NULL,
	"ends_on" date,
	"active" boolean DEFAULT true NOT NULL,
	"template" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_rules_ends_on_check" CHECK ("recurring_rules"."ends_on" is null or "recurring_rules"."ends_on" >= "recurring_rules"."next_run_on")
);
--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recurring_rules_user_active_next_run_idx" ON "recurring_rules" USING btree ("user_id","active","next_run_on");--> statement-breakpoint
CREATE INDEX "recurring_rules_user_next_run_idx" ON "recurring_rules" USING btree ("user_id","next_run_on");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurring_rule_id_recurring_rules_id_fk" FOREIGN KEY ("recurring_rule_id") REFERENCES "public"."recurring_rules"("id") ON DELETE set null ON UPDATE no action;