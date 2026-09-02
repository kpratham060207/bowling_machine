/** Outcome of a validation layer — structural, capability, or safety. */
export type ValidationOutcome = {
  valid: boolean;
  layer: 'STRUCTURAL' | 'MACHINE_CAPABILITY' | 'SAFETY';
  errors: Array<{ code: string; message: string; details?: Record<string, unknown> }>;
  warnings: string[];
};

export function validOutcome(
  layer: ValidationOutcome['layer'],
  warnings: string[] = [],
): ValidationOutcome {
  return { valid: true, layer, errors: [], warnings };
}

export function invalidOutcome(
  layer: ValidationOutcome['layer'],
  errors: ValidationOutcome['errors'],
  warnings: string[] = [],
): ValidationOutcome {
  return { valid: false, layer, errors, warnings };
}
