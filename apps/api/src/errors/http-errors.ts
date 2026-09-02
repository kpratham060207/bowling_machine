import type { ApiErrorCode } from '@bowling-machine/api-contracts';

/**
 * Typed HTTP error for consistent API responses.
 * Maps to shared ApiErrorResponseSchema codes — never expose raw DB errors.
 */
export class ApiHttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiHttpError';
  }

  static unauthorized(message = 'Authentication required'): ApiHttpError {
    return new ApiHttpError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'You do not have permission to perform this action'): ApiHttpError {
    return new ApiHttpError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Resource not found', details?: Record<string, unknown>): ApiHttpError {
    return new ApiHttpError(404, 'NOT_FOUND', message, details);
  }

  static validation(message: string, details?: Record<string, unknown>): ApiHttpError {
    return new ApiHttpError(400, 'VALIDATION_ERROR', message, details);
  }

  static conflict(message: string, details?: Record<string, unknown>): ApiHttpError {
    return new ApiHttpError(409, 'CONFLICT', message, details);
  }

  static internal(message = 'An unexpected error occurred'): ApiHttpError {
    return new ApiHttpError(500, 'INTERNAL_ERROR', message);
  }
}
