import { z } from 'zod';
import { NormalizedCoordinateSchema } from './primitives.js';

/**
 * Optional normalized UI coordinates from the perspective pitch visualization.
 * Used for marker replay only — NOT authoritative for calculation.
 */
export const UiCoordinatesSchema = z
  .object({
    ui_x: NormalizedCoordinateSchema.describe(
      'Horizontal position on pitch image (0=left, 1=right). Perspective-distorted.',
    ),
    ui_y: NormalizedCoordinateSchema.describe(
      'Vertical position on pitch image (0=top, 1=bottom). Does NOT map linearly to pitch length.',
    ),
  })
  .describe('Normalized tap position on the visualization — display replay only');

export type UiCoordinates = z.infer<typeof UiCoordinatesSchema>;
