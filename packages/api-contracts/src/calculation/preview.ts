import { z } from 'zod';
import { EntityIdSchema } from '../common/primitives.js';
import { BallTypeSchema } from '../delivery/ball-type.js';
import { MachineDeliveryParametersSchema } from '../delivery/machine-parameters.js';
import { PitchTargetSchema } from '../delivery/pitch-target.js';
import { CreateSessionDeliveryInputSchema } from '../session/create-session-request.js';

/**
 * Request body for software-only calculation.
 * Uses the same high-level delivery fields as session delivery creation.
 * machine_id is optional — when omitted the backend uses simulation calibration only.
 * Does not create sessions, deliveries, or machine commands.
 */
export const CalculationPreviewRequestSchema = CreateSessionDeliveryInputSchema.extend({
  machine_id: EntityIdSchema.optional().describe(
    'Machine whose active calibration drives the calculation — optional for software-only mode',
  ),
});

/** Stable calculation error surfaced to clients — mirrors calculation-engine codes. */
export const CalculationPreviewErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

/** User-level inputs echoed back — never mixed with calculated machine parameters. */
export const CalculationPreviewRequestedSchema = z.object({
  target: PitchTargetSchema,
  desired_speed_kmh: z.number().positive(),
  ball_type: BallTypeSchema,
  number_of_balls: z.number().int().min(1),
  first_ball_delay_ms: z.number().int().nonnegative(),
  interval_ms: z.number().int().nonnegative(),
});

/** Validation summary — valid when calculation succeeded with machine parameters. */
export const CalculationPreviewValidationSchema = z.object({
  valid: z.boolean(),
  errors: z.array(CalculationPreviewErrorSchema),
});

/** Calibration identity used for the preview — simulation clearly flagged. */
export const CalculationPreviewCalibrationSchema = z.object({
  profile_id: z.string(),
  calibration_type: z.string(),
  version: z.number().int(),
  /** True when profile data is explicitly simulation-only. */
  simulation: z.boolean(),
  /** True when backend used the built-in simulation fallback (no ACTIVE DB profile). */
  is_simulation_fallback: z.boolean(),
});

/**
 * Calculation preview response — software-only, no machine execution.
 * Calculated values are NOT observed hardware measurements.
 */
export const CalculationPreviewResponseSchema = z.object({
  preview: z.literal(true),
  /** SIMULATION when simulation calibration; PREVIEW when machine ACTIVE calibration was used. */
  result_mode: z.enum(['SIMULATION', 'PREVIEW']),
  disclaimer: z.string(),
  /** Machine whose calibration was used — null when pure simulation fallback with no machine context. */
  machine_id: EntityIdSchema.nullable(),
  requested: CalculationPreviewRequestedSchema,
  calculated: MachineDeliveryParametersSchema.nullable(),
  validation: CalculationPreviewValidationSchema,
  calibration: CalculationPreviewCalibrationSchema.nullable(),
  warnings: z.array(z.string()),
});

export type CalculationPreviewRequest = z.infer<typeof CalculationPreviewRequestSchema>;
export type CalculationPreviewResponse = z.infer<typeof CalculationPreviewResponseSchema>;
export type CalculationPreviewRequested = z.infer<typeof CalculationPreviewRequestedSchema>;
export type CalculationPreviewValidation = z.infer<typeof CalculationPreviewValidationSchema>;
export type CalculationPreviewCalibration = z.infer<typeof CalculationPreviewCalibrationSchema>;
