import { describe, expect, it } from 'vitest';
import type { FastifyRequest } from 'fastify';
import { ApiHttpError } from '../errors/http-errors.js';
import {
  rejectClientOwnershipFields,
  requireAdmin,
  requireAuthentication,
  requirePlayer,
} from './authorization.js';
import { getAuthContext } from './middleware.js';

function mockRequest(auth?: {
  userId: string;
  email: string;
  role: 'PLAYER' | 'ADMIN';
}): FastifyRequest {
  return {
    auth,
  } as FastifyRequest;
}

describe('authorization helpers', () => {
  it('requireAuthentication rejects missing auth context', () => {
    expect(() => {
      requireAuthentication(mockRequest());
    }).toThrow(ApiHttpError);
  });

  it('requirePlayer accepts PLAYER role', () => {
    expect(() => {
      requirePlayer(mockRequest({ userId: 'u1', email: 'a@test.local', role: 'PLAYER' }));
    }).not.toThrow();
  });

  it('requirePlayer accepts ADMIN role', () => {
    expect(() => {
      requirePlayer(mockRequest({ userId: 'u1', email: 'a@test.local', role: 'ADMIN' }));
    }).not.toThrow();
  });

  it('requireAdmin rejects PLAYER role', () => {
    expect(() => {
      requireAdmin(mockRequest({ userId: 'u1', email: 'a@test.local', role: 'PLAYER' }));
    }).toThrow(ApiHttpError);
  });

  it('requireAdmin accepts ADMIN role', () => {
    expect(() => {
      requireAdmin(mockRequest({ userId: 'u1', email: 'a@test.local', role: 'ADMIN' }));
    }).not.toThrow();
  });

  it('rejectClientOwnershipFields rejects user_id in body', () => {
    expect(() => {
      rejectClientOwnershipFields({ user_id: 'other' });
    }).toThrow(ApiHttpError);
  });

  it('rejectClientOwnershipFields rejects role elevation attempt', () => {
    expect(() => {
      rejectClientOwnershipFields({ role: 'ADMIN' });
    }).toThrow(ApiHttpError);
  });

  it('getAuthContext returns authenticated identity', () => {
    const auth = getAuthContext(
      mockRequest({ userId: 'player-a', email: 'a@test.local', role: 'PLAYER' }),
    );
    expect(auth.userId).toBe('player-a');
  });
});
