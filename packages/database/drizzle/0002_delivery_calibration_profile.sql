-- Phase 1J: preserve which calibration profile was used when a delivery was calculated.
ALTER TABLE "deliveries" ADD COLUMN IF NOT EXISTS "calibration_profile_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_calibration_profile_id_calibration_profiles_id_fk" FOREIGN KEY ("calibration_profile_id") REFERENCES "public"."calibration_profiles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deliveries_calibration_profile_id_idx" ON "deliveries" USING btree ("calibration_profile_id");
--> statement-breakpoint
ALTER TYPE "machine_fault_code" ADD VALUE IF NOT EXISTS 'WATCHDOG_TIMEOUT';
--> statement-breakpoint
ALTER TYPE "machine_fault_code" ADD VALUE IF NOT EXISTS 'COMMUNICATION_FAULT';
