import { z } from 'zod';

/**
 * Physical quantity schemas for machine telemetry and commands.
 * Units documented explicitly; unresolved units reference UD-02.
 */

/** Wheel RPM — unit: revolutions per minute. */
export const WheelRpmSchema = z
  .number()
  .nonnegative('RPM cannot be negative')
  .nullable()
  .describe('Wheel speed in RPM; null when unknown');

/**
 * Actuator position — unit UNRESOLVED (UD-02).
 * Machine-local calibration units until hardware specification is finalized.
 */
export const ActuatorPositionSchema = z
  .number()
  .nullable()
  .describe('Actuator position in unresolved machine-local units (UD-02)');

export const ActuatorPositionsSchema = z.tuple([
  ActuatorPositionSchema,
  ActuatorPositionSchema,
  ActuatorPositionSchema,
  ActuatorPositionSchema,
]);

export type WheelRpm = z.infer<typeof WheelRpmSchema>;
export type ActuatorPosition = z.infer<typeof ActuatorPositionSchema>;
