/**
 * @bowling-machine/api — Fastify backend with Supabase Auth integration.
 *
 * Phase 1D: authentication middleware, authorization helpers, profile routes.
 * Machine protocol, simulator, and calculation engine are intentionally not implemented.
 */
import { loadApiEnv } from './config/env.js';
import { startApiServer } from './server.js';

export { buildApiServer, startApiServer } from './server.js';
export type { ApiServer } from './server.js';
export { JwtVerifier } from './lib/jwt.js';
export { ApiHttpError } from './errors/http-errors.js';
export { getAuthContext, extractBearerToken, createAuthenticationHook } from './auth/middleware.js';
export {
  requireAuthentication,
  requirePlayer,
  requireAdmin,
  rejectClientOwnershipFields,
} from './auth/authorization.js';
export {
  assertSessionOwnership,
  assertDeliveryOwnership,
  assertPlanOwnership,
  assertProfileOwnershipByUserId,
} from './services/ownership.service.js';

async function main(): Promise<void> {
  const env = loadApiEnv();
  await startApiServer(env);
}

main().catch((error: unknown) => {
  console.error('[api] failed to start:', error);
  process.exit(1);
});
