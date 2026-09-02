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
import { registerMachineRoutes } from './routes/machine.routes.js';
import { MachineEventBus } from './gateway/event-bus.js';
import { DefaultMachineGateway } from './gateway/machine-gateway.js';
import { MachineService } from './services/machine.service.js';
import { MachineCommandService } from './services/machine-command.service.js';
import { registerMachineWebSocketRoutes } from './websocket/machine-ws.js';
import { registerBrowserWebSocketRoutes } from './websocket/browser-ws.js';

export type ApiServer = Awaited<ReturnType<typeof buildApiServer>>;

/**
 * Builds the Fastify application with authentication, machine gateway, and WebSockets.
 * Exported for integration tests — production entry uses startApiServer().
 */
export async function buildApiServer(env: ApiEnv) {
  const { db, sql } = createDatabase(env.DATABASE_URL);
  const jwtVerifier = new JwtVerifier(env);
  const supabaseAdmin = createSupabaseAdminClient(env);

  const eventBus = new MachineEventBus();
  const gateway = new DefaultMachineGateway(eventBus, env.MACHINE_HEARTBEAT_TIMEOUT_MS);
  const machineService = new MachineService(db, gateway, env.MACHINE_CONTROL_LOCK_TTL_MS);
  const commandService = new MachineCommandService(
    db,
    gateway,
    env.MACHINE_COMMAND_TTL_MS,
    env.MACHINE_COMMAND_ACK_TIMEOUT_MS,
  );

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

  await registerMachineWebSocketRoutes(app, { db, gateway });
  registerBrowserWebSocketRoutes(app, { db, jwtVerifier, eventBus });

  // Authorization hooks on nested plugins MUST be async — sync onRequest hooks in
  // encapsulated child plugins do not signal completion and authenticated inject() hangs.
  await app.register(async (protectedApi) => {
    protectedApi.addHook('onRequest', authenticate);

    await protectedApi.register((playerRoutes) => {
      playerRoutes.addHook('onRequest', requireAuthenticationHook);
      playerRoutes.addHook('onRequest', requirePlayerHook);
      registerProfileRoutes(playerRoutes, { db });
      registerMachineRoutes(playerRoutes, { db, machineService, commandService });
    });

    await protectedApi.register((adminRoutes) => {
      adminRoutes.addHook('onRequest', requireAuthenticationHook);
      adminRoutes.addHook('onRequest', requireAdminHook);
      registerAdminRoutes(adminRoutes);
    });
  });

  app.addHook('onClose', async () => {
    await sql.end();
  });

  await app.ready();

  return {
    app,
    db,
    sql,
    jwtVerifier,
    supabaseAdmin,
    authenticate,
    authenticateOptional,
    gateway,
    eventBus,
    machineService,
    commandService,
  };
}

export async function startApiServer(env: ApiEnv): Promise<ApiServer> {
  const server = await buildApiServer(env);
  await server.app.listen({ host: env.API_HOST, port: env.API_PORT });
  server.app.log.info(`API listening on http://${env.API_HOST}:${String(env.API_PORT)}`);
  return server;
}
