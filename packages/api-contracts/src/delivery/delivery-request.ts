import { z } from 'zod';
import { EntityIdSchema } from '../common/primitives.js';
import { UiCoordinatesSchema } from '../common/ui-coordinates.js';
import { BallTypeSchema, MAX_BALLS_PER_DELIVERY, MIN_INTERVAL_MS } from './ball-type.js';
import { PitchTargetSchema } from './pitch-target.js';

/**
 * Canonical user-level delivery request.
 *
 * Separation from machine parameters is intentional:
 * User intent → calculation engine → MachineDeliveryParameters
 *
 * Speed upper bound is NOT hard-coded — machine-specific limits belong to
 * calibration/safety validation layers.
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
      .describe('Desired ball speed in km/h — upper bound validated per machine calibration'),
    ball_type: BallTypeSchema,
    number_of_balls: z
      .number()
      .int('Ball count must be an integer')
      .min(1, 'At least one ball required')
      .max(MAX_BALLS_PER_DELIVERY, `Maximum ${String(MAX_BALLS_PER_DELIVERY)} balls per delivery`),
    first_ball_delay_ms: z
      .number()
      .int()
      .nonnegative('First ball delay cannot be negative')
      .describe('Delay before first ball — milliseconds'),
    interval_ms: z
      .number()
      .int()
      .min(MIN_INTERVAL_MS, `Interval must be at least ${String(MIN_INTERVAL_MS)} ms`)
      .describe('Delay between subsequent balls — milliseconds'),
    ui: UiCoordinatesSchema.optional().describe(
      'Optional UI replay coordinates — not used by engine',
    ),
  })
  .describe('User-level delivery request — never contains wheel RPM or actuator values');

export type DeliveryRequest = z.infer<typeof DeliveryRequestSchema>;
