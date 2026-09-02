import type { FastifyInstance } from 'fastify';

/** Public health check — no authentication required. */
export function registerHealthRoutes(app: FastifyInstance): void {
  app.get('/health', () => ({
    data: {
      status: 'ok',
      service: 'bowling-machine-api',
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  }));
}
