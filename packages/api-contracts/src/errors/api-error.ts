import { z } from 'zod';

/**
 * Stable API error codes for REST responses.
 * Human-readable `message` is supplementary — clients should branch on `code`.
 */
export const ApiErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'MACHINE_UNAVAILABLE',
  'MACHINE_NOT_CALIBRATED',
  'PROTOCOL_VERSION_UNSUPPORTED',
  'INTERNAL_ERROR',
]);

export const ApiErrorSchema = z.object({
  code: ApiErrorCodeSchema,
  message: z.string().min(1),
  details: z
    .unknown()
    .optional()
    .describe('Structured validation or context details — never stack traces'),
  request_id: z.string().uuid().optional().describe('Correlation ID for support and logging'),
});

export const ApiErrorResponseSchema = z.object({
  error: ApiErrorSchema,
});

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
