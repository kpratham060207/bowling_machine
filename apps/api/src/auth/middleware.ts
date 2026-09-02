import type { FastifyRequest } from 'fastify';
import type { Database } from '@bowling-machine/database';
import type { JwtVerifier } from '../lib/jwt.js';
import { ApiHttpError } from '../errors/http-errors.js';
import { loadAuthContextForUser } from './provisioning.js';
import type { AuthContext } from './types.js';

/**
 * Parses Authorization: Bearer header without throwing — used for optional auth routes.
 */
export function extractBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

/**
 * Authentication middleware factory.
 *
 * Validates Supabase JWT, loads application role from PostgreSQL, and attaches auth context.
 * Unauthenticated requests to protected routes must fail here — never in individual handlers alone.
 */
export function createAuthenticationHook(deps: {
  jwtVerifier: JwtVerifier;
  db: Database['db'];
  optional?: boolean;
}) {
  return async function authenticationHook(request: FastifyRequest): Promise<void> {
    const token = extractBearerToken(request);
    if (!token) {
      if (deps.optional) {
        return;
      }
      throw ApiHttpError.unauthorized();
    }

    let payload;
    try {
      payload = await deps.jwtVerifier.verifyAccessToken(token);
    } catch {
      throw ApiHttpError.unauthorized('Invalid or expired access token');
    }

    const email =
      typeof payload.email === 'string' ? payload.email : `${payload.sub}@unknown.local`;
    const applicationUser = await loadAuthContextForUser(deps.db, payload.sub, email);

    const authContext: AuthContext = {
      userId: applicationUser.userId,
      email: applicationUser.email,
      role: applicationUser.role,
    };

    request.auth = authContext;
  };
}

/** Returns authenticated context or throws — use inside route handlers after auth hook. */
export function getAuthContext(request: FastifyRequest): AuthContext {
  if (!request.auth) {
    throw ApiHttpError.unauthorized();
  }
  return request.auth;
}
