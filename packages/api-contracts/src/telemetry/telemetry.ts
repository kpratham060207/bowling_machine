import { z } from 'zod';
import { EntityIdSchema, TimestampSchema } from '../common/primitives.js';
import { CommandIdSchema } from '../common/primitives.js';
import { MachineFaultSchema } from '../errors/fault.js';
import { FeederStatusSchema, HomingStatusSchema } from '../machine/enums.js';
import { ActuatorPositionsSchema, WheelRpmSchema } from '../machine/quantities.js';
import { ImuOrientationSchema } from '../machine/status.js';
import { MachineStateSchema } from '../machine/state.js';

/**
 * Telemetry sample from machine peer — not every sample is persisted.
 * Gateway/telemetry layer decides retention policy.
 */
export const TelemetrySampleSchema = z.object({
  timestamp: TimestampSchema,
  machine_id: EntityIdSchema,
  state: MachineStateSchema,
  wheel1_current_rpm: WheelRpmSchema,
  wheel2_current_rpm: WheelRpmSchema,
  wheel1_target_rpm: WheelRpmSchema,
  wheel2_target_rpm: WheelRpmSchema,
  actuator_current_positions: ActuatorPositionsSchema,
  actuator_target_positions: ActuatorPositionsSchema,
  imu: ImuOrientationSchema.optional(),
  feeder_status: FeederStatusSchema,
  homing_status: HomingStatusSchema,
  emergency_stop_active: z.boolean(),
  active_fault: MachineFaultSchema.nullable(),
  active_command_id: CommandIdSchema.nullable().optional(),
  delivery_progress: z
    .object({
      delivery_id: EntityIdSchema,
      balls_delivered: z.number().int().nonnegative(),
      balls_remaining: z.number().int().nonnegative(),
    })
    .optional(),
});

export type TelemetrySample = z.infer<typeof TelemetrySampleSchema>;
