import { z } from 'zod';
import { EntityIdSchema } from '../common/primitives.js';
import { UiCoordinatesSchema } from '../common/ui-coordinates.js';
import { BallTypeSchema } from './ball-type.js';
import { PitchTargetSchema } from './pitch-target.js';

/**
 * Canonical user-level delivery request.
 *
 * Separation from machine parameters is intentional:
 * User intent → structural validation (this schema)
 * → machine capability validation → calculation → machine safety validation → ESP32
 *
 * This schema performs STRUCTURAL VALIDATION only:
 * - types, required fields, normalized coordinate domain, positive numeric speed
 *
 * It does NOT enforce product limits (max balls, min interval) or physical safety.
 * Those belong to machine configuration / calibration / safety validation layers.
 */
export const DeliveryRequestSchema = z
  .object({
    machine_id: EntityIdSchema.optional().describe('Target machine when not implied by session'),
    session_id: EntityIdSchema.optional().describe('Parent practice session when applicable'),
    target_x: PitchTargetSchema.shape.target_x,
    target_y: PitchTargetSchema.shape.target_y,
    desired_speed_kmh: z
      .number()
      .positive('Speed must be greater than 0 km/h')
      .describe(
        'Desired ball speed in km/h — structurally positive only; NOT safe/achievable until validated by machine config, calibration, and safety layers',
      ),
    ball_type: BallTypeSchema,
    number_of_balls: z
      .number()
      .int('Ball count must be an integer')
      .min(1, 'At least one ball required')
      .describe(
        'Number of balls — minimum 1 is structural; max count is machine/system validation',
      ),
    first_ball_delay_ms: z
      .number()
      .int()
      .nonnegative('First ball delay cannot be negative')
      .describe('Delay before first ball — milliseconds; min safe interval is machine validation'),
    interval_ms: z
      .number()
      .int()
      .nonnegative('Interval cannot be negative')
      .describe(
        'Delay between subsequent balls — milliseconds; min safe interval is machine validation',
      ),
    ui: UiCoordinatesSchema.optional().describe(
      'Optional UI replay coordinates — not used by engine',
    ),
  })
  .describe('User-level delivery request — never contains wheel RPM or actuator values');

export type DeliveryRequest = z.infer<typeof DeliveryRequestSchema>;
