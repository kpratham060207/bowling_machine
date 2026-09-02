import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createDatabase } from '@bowling-machine/database';
import type { ApiEnv } from './config/env.js';
import { JwtVerifier } from './lib/jwt.js';
import { createSupabaseAdminClient } from './lib/supabase-admin.js';
import { registerErrorHandler } from './errors/error-handler.js';
import { createAuthenticationHook } from './auth/middleware.js';
import {
  requireAdminHook,
  requireAuthenticationHook,
  requirePlayerHook,
} from './auth/authorization.js';
import { registerHealthRoutes } from './routes/health.routes.js';
import { registerAuthRoutes } from './routes/auth.routes.js';
import { registerProfileRoutes } from './routes/profile.routes.js';
import { registerAdminRoutes } from './routes/admin.routes.js';

export type ApiServer = Awaited<ReturnType<typeof buildApiServer>>;

/**
 * Builds the Fastify application with authentication and authorization hooks.
 * Exported for integration tests — production entry uses startApiServer().
 */
export async function buildApiServer(env: ApiEnv) {
  const { db, sql } = createDatabase(env.DATABASE_URL);
  const jwtVerifier = new JwtVerifier(env);
  const supabaseAdmin = createSupabaseAdminClient(env);

  const app = Fastify({
    logger: {
      level: env.API_LOG_LEVEL,
    },
    genReqId: () => crypto.randomUUID(),
  });

  registerErrorHandler(app);

  await app.register(cors, {
    origin: env.NODE_ENV === 'production' ? false : true,
    credentials: true,
  });

  const authenticate = createAuthenticationHook({ jwtVerifier, db });
  const authenticateOptional = createAuthenticationHook({ jwtVerifier, db, optional: true });

  registerHealthRoutes(app);
  registerAuthRoutes(app, { db, supabaseAdmin });

  app.register((protectedApi) => {
    protectedApi.addHook('onRequest', authenticate);

    protectedApi.register((playerRoutes) => {
      playerRoutes.addHook('onRequest', requireAuthenticationHook);
      playerRoutes.addHook('onRequest', requirePlayerHook);
      registerProfileRoutes(playerRoutes, { db });
    });

    protectedApi.register((adminRoutes) => {
      adminRoutes.addHook('onRequest', requireAuthenticationHook);
      adminRoutes.addHook('onRequest', requireAdminHook);
      registerAdminRoutes(adminRoutes);
    });
  });

  app.addHook('onClose', () => sql.end());

  return { app, db, sql, jwtVerifier, supabaseAdmin, authenticate, authenticateOptional };
}

export async function startApiServer(env: ApiEnv): Promise<ApiServer> {
  const server = await buildApiServer(env);
  await server.app.listen({ host: env.API_HOST, port: env.API_PORT });
  server.app.log.info(`API listening on http://${env.API_HOST}:${String(env.API_PORT)}`);
  return server;
}
