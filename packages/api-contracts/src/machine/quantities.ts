import { z } from 'zod';

/**
 * Physical quantity schemas for machine telemetry and commands.
 * Units documented explicitly; unresolved units reference UD-02.
 */

/** Wheel RPM — unit: revolutions per minute (numeric type only).
 *  Non-negative is structural; achievable max RPM is machine/safety validation (UD-03). */
export const WheelRpmSchema = z
  .number()
  .nonnegative('RPM cannot be negative')
  .nullable()
  .describe('Wheel speed in RPM; null when unknown');

/**
 * Actuator target/current position.
 *
 * Calculation-engine / THROW_SEQUENCE semantic (software layer): actuator
 * length in **meters** from 3D inverse kinematics (UD-02 partially resolved).
 * Mapping length → motor steps/PWM remains a separate calibration concern
 * and is still unresolved for real hardware.
 */
export const ActuatorPositionSchema = z
  .number()
  .nullable()
  .describe(
    'Actuator length in meters (calculation engine); length↔motor mapping unresolved (UD-02)',
  );

export const ActuatorPositionsSchema = z.tuple([
  ActuatorPositionSchema,
  ActuatorPositionSchema,
  ActuatorPositionSchema,
  ActuatorPositionSchema,
]);

export type WheelRpm = z.infer<typeof WheelRpmSchema>;
export type ActuatorPosition = z.infer<typeof ActuatorPositionSchema>;
