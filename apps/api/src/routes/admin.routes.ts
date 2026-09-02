import type { FastifyInstance } from 'fastify';
import { getAuthContext } from '../auth/middleware.js';

/**
 * Minimal admin route surface for Phase 1D authorization testing.
 * Full admin features (user management, machines, audit) arrive in later phases.
 */
export function registerAdminRoutes(app: FastifyInstance): void {
  app.get('/api/v1/admin/status', (request) => {
    const auth = getAuthContext(request);

    return {
      data: {
        admin: true,
        user_id: auth.userId,
        role: auth.role,
      },
      meta: { timestamp: new Date().toISOString() },
    };
  });
}
