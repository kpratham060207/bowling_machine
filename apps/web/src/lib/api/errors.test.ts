import { describe, expect, it } from 'vitest';
import { ApiClientError } from './errors';

describe('ApiClientError', () => {
  it('maps API error codes to user-friendly messages', () => {
    const error = new ApiClientError(
      409,
      'CONFLICT',
      'Machine is currently controlled by another player',
    );
    expect(error.displayMessage).toBe('Machine is currently controlled by another player');
  });

  it('hides internal errors behind generic message', () => {
    const error = ApiClientError.fromResponse(500, {
      error: { code: 'INTERNAL_ERROR', message: 'stack trace' },
    });
    expect(error.displayMessage).toBe('Something went wrong. Please try again.');
  });
});
