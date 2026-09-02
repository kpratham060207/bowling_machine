import { DeliveryRequestSchema, type DeliveryRequest } from '@bowling-machine/api-contracts';
import { invalidOutcome, validOutcome, type ValidationOutcome } from '../types/validation.js';

/**
 * Structural validation — uses shared DeliveryRequestSchema (Zod).
 * Does NOT enforce machine capability or physical safety.
 */
export function validateStructural(request: unknown): {
  outcome: ValidationOutcome;
  parsed: DeliveryRequest | null;
} {
  const result = DeliveryRequestSchema.safeParse(request);
  if (!result.success) {
    return {
      parsed: null,
      outcome: invalidOutcome(
        'STRUCTURAL',
        result.error.issues.map((issue) => ({
          code: 'STRUCTURAL_VALIDATION_FAILED',
          message: issue.message,
          details: { path: issue.path.join('.') },
        })),
      ),
    };
  }

  return {
    parsed: result.data,
    outcome: validOutcome('STRUCTURAL'),
  };
}
