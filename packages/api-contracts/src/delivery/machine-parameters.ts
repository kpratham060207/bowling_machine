import { z } from 'zod';
import { ActuatorPositionSchema, WheelRpmSchema } from '../machine/quantities.js';

/**
 * Machine-level delivery parameters — output of calculation engine, input to THROW_SEQUENCE.
 *
 * Nullable fields indicate values not yet available from calibration (Phase 1B).
 * ESP32/simulator MUST reject execution when required fields are null.
 *
 * Units:
 * - wheel*_target_rpm: RPM
 * - actuator*_target_position: UNRESOLVED machine-local units (UD-02)
 * - feeder_delay_ms, first_ball_delay_ms, interval_ms: milliseconds
 */
export const MachineDeliveryParametersSchema = z.object({
  wheel1_target_rpm: WheelRpmSchema.describe('Target RPM wheel 1 — null until calibrated'),
  wheel2_target_rpm: WheelRpmSchema.describe('Target RPM wheel 2 — null until calibrated'),
  actuator1_target_position: ActuatorPositionSchema,
  actuator2_target_position: ActuatorPositionSchema,
  actuator3_target_position: ActuatorPositionSchema,
  actuator4_target_position: ActuatorPositionSchema,
  feeder_delay_ms: z
    .number()
    .int()
    .nonnegative()
    .nullable()
    .describe('Delay before feed after wheels at speed — ms; null until calibrated'),
  ball_count: z.number().int().min(1),
  first_ball_delay_ms: z.number().int().nonnegative(),
  interval_ms: z.number().int().min(1000),
});

export type MachineDeliveryParameters = z.infer<typeof MachineDeliveryParametersSchema>;
