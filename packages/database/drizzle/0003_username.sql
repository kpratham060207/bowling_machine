-- Phase 1K: globally unique player usernames + app-password tracking
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "username" varchar(32);
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "normalized_username" varchar(32);
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "has_password_credential" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "profiles_normalized_username_unique" ON "profiles" ("normalized_username") WHERE "normalized_username" IS NOT NULL;
