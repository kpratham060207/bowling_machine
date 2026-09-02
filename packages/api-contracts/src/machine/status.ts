import { z } from 'zod';
import { EntityIdSchema, TimestampSchema } from '../common/primitives.js';
import { CommandIdSchema } from '../common/primitives.js';
import { MachineFaultSchema } from '../errors/fault.js';
import {
  FeederStatusSchema,
  HomingStatusSchema,
  MachineConnectionStatusSchema,
  MachineKindSchema,
} from './enums.js';
import { ActuatorPositionsSchema, WheelRpmSchema } from './quantities.js';
import { MachineStateSchema } from './state.js';
/**
 * IMU orientation axes (pitch, roll, yaw).
 *
 * Physical unit UNRESOLVED — architecture identifies these axes but does not finalize
 * the hardware representation. Values are numeric only. Firmware may provisionally
 * use degrees, but this contract does NOT lock in a permanent unit; a future protocol
 * revision may add an explicit unit field once hardware specification is complete.
 */
export const ImuOrientationSchema = z.object({
  pitch: z.number().describe('IMU pitch axis — unit UNRESOLVED (provisional numeric)'),
  roll: z.number().describe('IMU roll axis — unit UNRESOLVED (provisional numeric)'),
  yaw: z.number().describe('IMU yaw axis — unit UNRESOLVED (provisional numeric)'),
});

/** Live machine status snapshot — combines state, targets, and actuals. */
export const MachineStatusSchema = z.object({
  machine_id: EntityIdSchema,
  timestamp: TimestampSchema,
  kind: MachineKindSchema,
  connection_status: MachineConnectionStatusSchema,
  state: MachineStateSchema,
  active_command_id: CommandIdSchema.nullable().describe('Command currently executing, if any'),
  active_delivery_id: EntityIdSchema.nullable().describe(
    'Delivery linked to active command, if any',
  ),
  // Current (actual) wheel speeds from encoders
  wheel1_current_rpm: WheelRpmSchema,
  wheel2_current_rpm: WheelRpmSchema,
  // Target wheel speeds from active command
  wheel1_target_rpm: WheelRpmSchema,
  wheel2_target_rpm: WheelRpmSchema,
  actuator_current_positions: ActuatorPositionsSchema,
  actuator_target_positions: ActuatorPositionsSchema,
  imu: ImuOrientationSchema.optional(),
  feeder_status: FeederStatusSchema,
  homing_status: HomingStatusSchema,
  emergency_stop_active: z.boolean(),
  active_fault: MachineFaultSchema.nullable(),
  /** Progress within an active throw sequence — optional until peer reports it. */
  delivery_progress: z
    .object({
      delivery_id: EntityIdSchema,
      balls_delivered: z.number().int().nonnegative(),
      balls_remaining: z.number().int().nonnegative(),
    })
    .optional(),
});

export type MachineStatus = z.infer<typeof MachineStatusSchema>;
export type ImuOrientation = z.infer<typeof ImuOrientationSchema>;
