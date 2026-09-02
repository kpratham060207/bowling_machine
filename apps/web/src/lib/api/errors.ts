import type { ApiError, ApiErrorCode } from '@bowling-machine/api-contracts';

/**
 * Normalized API error for UI handling — never exposes stack traces or secrets.
 */
export class ApiClientError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }

  static fromResponse(status: number, body: unknown): ApiClientError {
    const parsed = body as { error?: ApiError };
    const error = parsed.error;
    if (error?.code && error.message) {
      return new ApiClientError(
        status,
        error.code,
        error.message,
        typeof error.details === 'object' && error.details !== null
          ? (error.details as Record<string, unknown>)
          : undefined,
      );
    }
    return new ApiClientError(status, 'INTERNAL_ERROR', 'An unexpected error occurred');
  }

  /** User-friendly message suitable for display — no internal codes in prose. */
  get displayMessage(): string {
    switch (this.code) {
      case 'UNAUTHORIZED':
        return 'Your session has expired. Please sign in again.';
      case 'FORBIDDEN':
        return 'You do not have permission to perform this action.';
      case 'NOT_FOUND':
        return 'The requested resource was not found.';
      case 'CONFLICT':
        return this.message;
      case 'VALIDATION_ERROR':
        return this.message;
      case 'MACHINE_UNAVAILABLE':
      case 'MACHINE_NOT_CALIBRATED':
        return this.message;
      default:
        return 'Something went wrong. Please try again.';
    }
  }
}
