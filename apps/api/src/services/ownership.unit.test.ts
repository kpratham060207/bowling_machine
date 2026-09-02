import { describe, expect, it } from 'vitest';
import { assertProfileOwnershipByUserId } from '../services/ownership.service.js';
import { ApiHttpError } from '../errors/http-errors.js';

describe('assertProfileOwnershipByUserId', () => {
  it('allows access when user ids match', () => {
    expect(() => {
      assertProfileOwnershipByUserId('player-a', 'player-a');
    }).not.toThrow();
  });

  it('rejects cross-player profile access', () => {
    expect(() => {
      assertProfileOwnershipByUserId('player-a', 'player-b');
    }).toThrow(ApiHttpError);
  });
});
