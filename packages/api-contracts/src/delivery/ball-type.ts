import { z } from 'zod';

/**
 * Extensible ball type enum — add new values via schema version bump and migration.
 * Do not hard-code only in frontend.
 */
export const BallTypeSchema = z.enum([
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

export type BallType = z.infer<typeof BallTypeSchema>;
