import type { FastifyRequest } from 'fastify';
import { ApiHttpError } from '../errors/http-errors.js';
import { getAuthContext } from './middleware.js';

/**
 * Centralized authorization helpers — all role checks go through here.
 * Route handlers must not compare roles ad hoc; reuse these guards.
 */

export function requireAuthentication(request: FastifyRequest): void {
  getAuthContext(request);
}

/**
 * PLAYER and ADMIN both satisfy player-scoped routes (admins may also practice).
 * With only two application roles, any authenticated user qualifies.
 */
export function requirePlayer(request: FastifyRequest): void {
  requireAuthentication(request);
}

/** ADMIN-only routes — role is loaded from DB, never from request body. */
export function requireAdmin(request: FastifyRequest): void {
  const auth = getAuthContext(request);
  if (auth.role !== 'ADMIN') {
    throw ApiHttpError.forbidden('Administrator access required');
  }
}

/**
 * Rejects client attempts to supply ownership or role fields in write payloads.
 * Prevents IDOR via body.user_id and privilege escalation via body.role.
 */
export function rejectClientOwnershipFields(body: Record<string, unknown>): void {
  const forbiddenKeys = ['user_id', 'userId', 'player_id', 'playerId', 'id', 'role'];
  for (const key of forbiddenKeys) {
    if (key in body) {
      throw ApiHttpError.validation(
        `Field "${key}" is not accepted — ownership comes from your session`,
      );
    }
  }
}

/**
 * Fastify onRequest hook — returns a Promise so nested encapsulated plugins signal
 * completion. Sync hooks in child plugins cause authenticated inject() to hang indefinitely.
 */
export function requireAuthenticationHook(request: FastifyRequest): Promise<void> {
  requireAuthentication(request);
  return Promise.resolve();
}

/** See requireAuthenticationHook — Promise return required for Fastify nested hooks. */
export function requirePlayerHook(request: FastifyRequest): Promise<void> {
  requirePlayer(request);
  return Promise.resolve();
}

/** See requireAuthenticationHook — Promise return required for Fastify nested hooks. */
export function requireAdminHook(request: FastifyRequest): Promise<void> {
  requireAdmin(request);
  return Promise.resolve();
}
