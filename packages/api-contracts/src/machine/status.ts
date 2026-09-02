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
 * IMU orientation — unit: degrees.
 * Represents machine orientation feedback; calibration-dependent accuracy.
 */
export const ImuOrientationSchema = z.object({
  pitch: z.number().describe('Pitch in degrees'),
  roll: z.number().describe('Roll in degrees'),
  yaw: z.number().describe('Yaw in degrees'),
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
});

export type MachineStatus = z.infer<typeof MachineStatusSchema>;
export type ImuOrientation = z.infer<typeof ImuOrientationSchema>;
