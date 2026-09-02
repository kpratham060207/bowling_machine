CREATE TYPE "public"."ball_type" AS ENUM('FAST', 'MEDIUM', 'SLOW', 'BOUNCER', 'YORKER', 'FULL', 'INSWING', 'OUTSWING', 'LEG_SPIN', 'OFF_SPIN');--> statement-breakpoint
CREATE TYPE "public"."calibration_profile_status" AS ENUM('DRAFT', 'ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('PENDING', 'EXECUTING', 'COMPLETED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."fault_severity" AS ENUM('INFO', 'WARNING', 'ERROR', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."firmware_release_status" AS ENUM('DRAFT', 'RELEASED', 'DEPRECATED');--> statement-breakpoint
CREATE TYPE "public"."hand_preference" AS ENUM('RIGHT', 'LEFT', 'AMBIDEXTROUS', 'UNSPECIFIED');--> statement-breakpoint
CREATE TYPE "public"."machine_command_status" AS ENUM('PENDING', 'DISPATCHED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."machine_command_type" AS ENUM('PING', 'STATUS', 'HOME', 'STOP', 'PAUSE', 'RESUME', 'SET_CONFIGURATION', 'THROW_SEQUENCE');--> statement-breakpoint
CREATE TYPE "public"."machine_fault_code" AS ENUM('ACTUATOR_LIMIT', 'ACTUATOR_TIMEOUT', 'ENCODER_FAILURE', 'FEEDER_JAM', 'RPM_LIMIT_EXCEEDED', 'RPM_NOT_ACHIEVED', 'COMMAND_EXPIRED', 'COMMAND_REJECTED', 'EMERGENCY_STOP', 'HOMING_FAILED', 'IMU_FAILURE', 'POWER_FAULT', 'UNCALIBRATED', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."machine_kind" AS ENUM('SIMULATOR', 'HARDWARE');--> statement-breakpoint
CREATE TYPE "public"."machine_registry_status" AS ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('PLAYER', 'ADMIN');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'PLAYER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"batting_hand" "hand_preference" DEFAULT 'UNSPECIFIED' NOT NULL,
	"bowling_hand" "hand_preference" DEFAULT 'UNSPECIFIED' NOT NULL,
	"skill_level" varchar(50),
	"practice_goals" jsonb,
	"preferences" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "firmware_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" varchar(50) NOT NULL,
	"release_status" "firmware_release_status" DEFAULT 'DRAFT' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "machines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"serial_number" varchar(50) NOT NULL,
	"registry_status" "machine_registry_status" DEFAULT 'ACTIVE' NOT NULL,
	"kind" "machine_kind" DEFAULT 'HARDWARE' NOT NULL,
	"protocol_version" varchar(10) DEFAULT '1.0' NOT NULL,
	"firmware_version_id" uuid,
	"last_known_firmware_version" varchar(50),
	"last_seen_at" timestamp with time zone,
	"config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "machine_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"machine_id" uuid NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "machine_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"machine_id" uuid NOT NULL,
	"qr_code_token" varchar(128) NOT NULL,
	"connection_secret_hash" varchar(255) NOT NULL,
	"local_ip" varchar(45),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"machine_id" uuid NOT NULL,
	"status" "session_status" DEFAULT 'ACTIVE' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"total_balls_planned" integer DEFAULT 0 NOT NULL,
	"total_balls_delivered" integer DEFAULT 0 NOT NULL,
	"config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "machine_commands" (
	"id" uuid PRIMARY KEY NOT NULL,
	"machine_id" uuid NOT NULL,
	"command_type" "machine_command_type" NOT NULL,
	"protocol_version" varchar(10) NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"payload" jsonb NOT NULL,
	"status" "machine_command_status" DEFAULT 'PENDING' NOT NULL,
	"ack_accepted" boolean,
	"ack_error_code" "machine_fault_code",
	"ack_message" varchar(500),
	"acked_at" timestamp with time zone,
	"session_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"sequence_number" integer NOT NULL,
	"ui_x" numeric(5, 4),
	"ui_y" numeric(5, 4),
	"target_x" numeric(5, 4) NOT NULL,
	"target_y" numeric(5, 4) NOT NULL,
	"desired_speed_kmh" numeric(6, 2) NOT NULL,
	"ball_type" "ball_type" NOT NULL,
	"number_of_balls" integer NOT NULL,
	"first_ball_delay_ms" integer DEFAULT 0 NOT NULL,
	"interval_ms" integer DEFAULT 0 NOT NULL,
	"calculated_parameters" jsonb,
	"status" "delivery_status" DEFAULT 'PENDING' NOT NULL,
	"machine_command_id" uuid,
	"executed_at" timestamp with time zone,
	"measured" jsonb,
	"error" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice_plan_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"sequence_number" integer NOT NULL,
	"target_x" numeric(5, 4) NOT NULL,
	"target_y" numeric(5, 4) NOT NULL,
	"desired_speed_kmh" numeric(6, 2) NOT NULL,
	"ball_type" "ball_type" NOT NULL,
	"number_of_balls" integer NOT NULL,
	"first_ball_delay_ms" integer DEFAULT 0 NOT NULL,
	"interval_ms" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemetry_samples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"machine_id" uuid NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"state" varchar(30) NOT NULL,
	"wheel1_current_rpm" numeric(10, 2),
	"wheel2_current_rpm" numeric(10, 2),
	"wheel1_target_rpm" numeric(10, 2),
	"wheel2_target_rpm" numeric(10, 2),
	"actuator_current_positions" jsonb,
	"actuator_target_positions" jsonb,
	"imu" jsonb,
	"feeder_status" varchar(20),
	"homing_status" varchar(20),
	"emergency_stop_active" boolean DEFAULT false NOT NULL,
	"active_fault_code" varchar(50),
	"active_command_id" uuid,
	"session_id" uuid,
	"delivery_id" uuid
);
--> statement-breakpoint
CREATE TABLE "faults" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"machine_id" uuid NOT NULL,
	"fault_code" "machine_fault_code" NOT NULL,
	"severity" "fault_severity" NOT NULL,
	"message" varchar(500) NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recoverable" boolean DEFAULT false NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp with time zone,
	"command_id" uuid,
	"delivery_id" uuid,
	"session_id" uuid
);
--> statement-breakpoint
CREATE TABLE "calibration_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"machine_id" uuid NOT NULL,
	"calibration_type" varchar(50) NOT NULL,
	"version" integer NOT NULL,
	"status" "calibration_profile_status" DEFAULT 'DRAFT' NOT NULL,
	"data" jsonb NOT NULL,
	"created_by" uuid,
	"notes" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"resource_id" uuid,
	"details" jsonb,
	"ip_address" varchar(45),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machines" ADD CONSTRAINT "machines_firmware_version_id_firmware_versions_id_fk" FOREIGN KEY ("firmware_version_id") REFERENCES "public"."firmware_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_access" ADD CONSTRAINT "machine_access_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_access" ADD CONSTRAINT "machine_access_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_registrations" ADD CONSTRAINT "machine_registrations_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_commands" ADD CONSTRAINT "machine_commands_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_commands" ADD CONSTRAINT "machine_commands_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_machine_command_id_machine_commands_id_fk" FOREIGN KEY ("machine_command_id") REFERENCES "public"."machine_commands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_plans" ADD CONSTRAINT "practice_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_plan_deliveries" ADD CONSTRAINT "practice_plan_deliveries_plan_id_practice_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."practice_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_samples" ADD CONSTRAINT "telemetry_samples_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_samples" ADD CONSTRAINT "telemetry_samples_active_command_id_machine_commands_id_fk" FOREIGN KEY ("active_command_id") REFERENCES "public"."machine_commands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_samples" ADD CONSTRAINT "telemetry_samples_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_samples" ADD CONSTRAINT "telemetry_samples_delivery_id_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faults" ADD CONSTRAINT "faults_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faults" ADD CONSTRAINT "faults_command_id_machine_commands_id_fk" FOREIGN KEY ("command_id") REFERENCES "public"."machine_commands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faults" ADD CONSTRAINT "faults_delivery_id_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faults" ADD CONSTRAINT "faults_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calibration_profiles" ADD CONSTRAINT "calibration_profiles_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calibration_profiles" ADD CONSTRAINT "calibration_profiles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "profiles_user_id_idx" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "firmware_versions_version_unique" ON "firmware_versions" USING btree ("version");--> statement-breakpoint
CREATE UNIQUE INDEX "machines_serial_number_unique" ON "machines" USING btree ("serial_number");--> statement-breakpoint
CREATE INDEX "machines_registry_status_idx" ON "machines" USING btree ("registry_status");--> statement-breakpoint
CREATE UNIQUE INDEX "machine_access_user_machine_unique" ON "machine_access" USING btree ("user_id","machine_id");--> statement-breakpoint
CREATE INDEX "machine_access_user_id_idx" ON "machine_access" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "machine_access_machine_id_idx" ON "machine_access" USING btree ("machine_id");--> statement-breakpoint
CREATE UNIQUE INDEX "machine_registrations_qr_token_unique" ON "machine_registrations" USING btree ("qr_code_token");--> statement-breakpoint
CREATE INDEX "machine_registrations_machine_id_idx" ON "machine_registrations" USING btree ("machine_id");--> statement-breakpoint
CREATE INDEX "practice_sessions_user_started_idx" ON "practice_sessions" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "practice_sessions_machine_id_idx" ON "practice_sessions" USING btree ("machine_id");--> statement-breakpoint
CREATE INDEX "practice_sessions_status_idx" ON "practice_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "machine_commands_machine_id_idx" ON "machine_commands" USING btree ("machine_id");--> statement-breakpoint
CREATE INDEX "machine_commands_status_idx" ON "machine_commands" USING btree ("status");--> statement-breakpoint
CREATE INDEX "machine_commands_session_id_idx" ON "machine_commands" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "machine_commands_issued_at_idx" ON "machine_commands" USING btree ("issued_at");--> statement-breakpoint
CREATE UNIQUE INDEX "deliveries_session_sequence_unique" ON "deliveries" USING btree ("session_id","sequence_number");--> statement-breakpoint
CREATE INDEX "deliveries_session_id_idx" ON "deliveries" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "deliveries_status_idx" ON "deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "deliveries_machine_command_id_idx" ON "deliveries" USING btree ("machine_command_id");--> statement-breakpoint
CREATE INDEX "practice_plans_user_id_idx" ON "practice_plans" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "practice_plan_deliveries_plan_sequence_unique" ON "practice_plan_deliveries" USING btree ("plan_id","sequence_number");--> statement-breakpoint
CREATE INDEX "practice_plan_deliveries_plan_id_idx" ON "practice_plan_deliveries" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "telemetry_samples_machine_time_idx" ON "telemetry_samples" USING btree ("machine_id","recorded_at");--> statement-breakpoint
CREATE INDEX "telemetry_samples_session_id_idx" ON "telemetry_samples" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "faults_machine_time_idx" ON "faults" USING btree ("machine_id","occurred_at");--> statement-breakpoint
CREATE INDEX "faults_resolved_idx" ON "faults" USING btree ("resolved");--> statement-breakpoint
CREATE UNIQUE INDEX "calibration_profiles_machine_type_version_unique" ON "calibration_profiles" USING btree ("machine_id","calibration_type","version");--> statement-breakpoint
CREATE INDEX "calibration_profiles_machine_status_idx" ON "calibration_profiles" USING btree ("machine_id","status");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");