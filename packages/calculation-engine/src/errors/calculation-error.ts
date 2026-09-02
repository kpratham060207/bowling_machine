/**
 * Stable machine-readable calculation error codes.
 * Callers map these to API responses — not raw exception strings.
 */
export const CalculationErrorCodeSchema = [
  'INVALID_TARGET',
  'INVALID_BALL_TYPE',
  'MISSING_CALIBRATION',
  'INVALID_CALIBRATION',
  'INCOMPATIBLE_MACHINE_CONFIGURATION',
  'CALCULATION_FAILURE',
  'UNSUPPORTED_CAPABILITY',
  'STRUCTURAL_VALIDATION_FAILED',
] as const;

export type CalculationErrorCode = (typeof CalculationErrorCodeSchema)[number];

/** Structured calculation error with stable code and human-readable detail. */
export type CalculationError = {
  code: CalculationErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

export function calculationError(
  code: CalculationErrorCode,
  message: string,
  details?: Record<string, unknown>,
): CalculationError {
  return { code, message, details };
}
