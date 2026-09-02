import { z } from 'zod';
import { NormalizedCoordinateSchema } from '../common/primitives.js';
import { UiCoordinatesSchema } from '../common/ui-coordinates.js';

/**
 * Authoritative normalized pitch target (interactive pitch coordinate system).
 * Produced by Pitch Coordinate Mapper — NOT raw screen pixels.
 */
export const PitchTargetSchema = z
  .object({
    target_x: NormalizedCoordinateSchema.describe(
      'Normalized pitch horizontal (0–1). Persisted authoritative target.',
    ),
    target_y: NormalizedCoordinateSchema.describe(
      'Normalized pitch length (0–1). Persisted authoritative target.',
    ),
  })
  .describe('Normalized pitch target — input to trajectory/calculation engine');

/**
 * Optional UI coordinates for visualization replay only.
 * Must NOT be used as the authoritative target for calculation.
 */
export const PitchTargetWithUiSchema = PitchTargetSchema.extend({
  ui: UiCoordinatesSchema.optional(),
});

export type PitchTarget = z.infer<typeof PitchTargetSchema>;
export type PitchTargetWithUi = z.infer<typeof PitchTargetWithUiSchema>;
