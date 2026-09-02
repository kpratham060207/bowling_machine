import type { UserRole } from '@bowling-machine/api-contracts';

/**
 * Authenticated request context attached after JWT verification.
 *
 * `userId` is the Supabase Auth UUID and matches `users.id` — the canonical player identity.
 * Role is loaded from the application database, never from JWT claims or client input.
 */
export type AuthContext = {
  userId: string;
  email: string;
  role: UserRole;
};

declare module 'fastify' {
  interface FastifyRequest {
    /** Populated by authentication middleware when a valid Bearer token is present. */
    auth?: AuthContext;
  }
}
