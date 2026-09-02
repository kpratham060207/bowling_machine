/**
 * PostgreSQL enums aligned with packages/api-contracts.
 * Values must stay in sync with Zod schemas — update both when extending.
 */
import { pgEnum } from 'drizzle-orm/pg-core';

/** Application roles — PLAYER and ADMIN only. */
export const userRoleEnum = pgEnum('user_role', ['PLAYER', 'ADMIN']);

/** Hand preference for batting/bowling — matches HandPreferenceSchema. */
export const handPreferenceEnum = pgEnum('hand_preference', [
  'RIGHT',
  'LEFT',
  'AMBIDEXTROUS',
  'UNSPECIFIED',
]);

/** Ball types — matches BallTypeSchema. Extend via migration. */
export const ballTypeEnum = pgEnum('ball_type', [
  'FAST',
  'MEDIUM',
  'SLOW',
  'BOUNCER',
  'YORKER',
  'FULL',
  'INSWING',
  'OUTSWING',
  'LEG_SPIN',
  'OFF_SPIN',
]);

/** Machine registry/admin status — not runtime machine state. */
export const machineRegistryStatusEnum = pgEnum('machine_registry_status', [
  'ACTIVE',
  'INACTIVE',
  'MAINTENANCE',
]);

/** Simulator vs real ESP32 hardware. */
export const machineKindEnum = pgEnum('machine_kind', ['SIMULATOR', 'HARDWARE']);

/** Practice session lifecycle — matches SessionStatusSchema. */
export const sessionStatusEnum = pgEnum('session_status', [
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'CANCELLED',
]);

/** Delivery execution status — matches DeliveryStatusSchema. */
export const deliveryStatusEnum = pgEnum('delivery_status', [
  'PENDING',
  'EXECUTING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);

/** Domain machine command types — matches MachineCommandTypeSchema. */
export const machineCommandTypeEnum = pgEnum('machine_command_type', [
  'PING',
  'STATUS',
  'HOME',
  'STOP',
  'PAUSE',
  'RESUME',
  'SET_CONFIGURATION',
  'THROW_SEQUENCE',
]);

/** Persisted command lifecycle for audit/idempotency. */
export const machineCommandStatusEnum = pgEnum('machine_command_status', [
  'PENDING',
  'DISPATCHED',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
  'FAILED',
]);

/** Fault severity — matches FaultSeveritySchema. */
export const faultSeverityEnum = pgEnum('fault_severity', ['INFO', 'WARNING', 'ERROR', 'CRITICAL']);

/** Stable machine fault codes — matches MachineFaultCodeSchema subset persisted in DB. */
export const machineFaultCodeEnum = pgEnum('machine_fault_code', [
  'ACTUATOR_LIMIT',
  'ACTUATOR_TIMEOUT',
  'ENCODER_FAILURE',
  'FEEDER_JAM',
  'RPM_LIMIT_EXCEEDED',
  'RPM_NOT_ACHIEVED',
  'COMMAND_EXPIRED',
  'COMMAND_REJECTED',
  'EMERGENCY_STOP',
  'HOMING_FAILED',
  'IMU_FAILURE',
  'POWER_FAULT',
  'UNCALIBRATED',
  'UNKNOWN',
]);

/** Calibration profile lifecycle. */
export const calibrationProfileStatusEnum = pgEnum('calibration_profile_status', [
  'DRAFT',
  'ACTIVE',
  'ARCHIVED',
]);

/** Firmware release tracking — OTA not implemented in MVP. */
export const firmwareReleaseStatusEnum = pgEnum('firmware_release_status', [
  'DRAFT',
  'RELEASED',
  'DEPRECATED',
]);
