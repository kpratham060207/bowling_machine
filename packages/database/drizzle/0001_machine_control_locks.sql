CREATE TABLE IF NOT EXISTS "machine_control_locks" (
	"machine_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"acquired_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"released_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "machine_control_locks" ADD CONSTRAINT "machine_control_locks_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "machine_control_locks" ADD CONSTRAINT "machine_control_locks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "machine_control_locks_user_id_idx" ON "machine_control_locks" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "machine_control_locks_expires_at_idx" ON "machine_control_locks" USING btree ("expires_at");
