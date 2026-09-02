import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  CreateDeliveryRequestSchema,
  CreateSessionRequestSchema,
} from '@bowling-machine/api-contracts';
import type { Database } from '@bowling-machine/database';
import { getAuthContext } from '../auth/middleware.js';
import { rejectClientOwnershipFields } from '../auth/authorization.js';
import { assertPlayerMachineAccess } from '../services/machine-access.service.js';
import type { DeliveryOrchestrationService } from '../services/delivery-orchestration.service.js';
import type { SessionService } from '../services/session.service.js';
import type { OrchestrationEventPublisher } from '../services/orchestration-event-publisher.js';

type SessionRouteDeps = {
  db: Database['db'];
  sessionService: SessionService;
  deliveryOrchestration: DeliveryOrchestrationService;
  eventPublisher: OrchestrationEventPublisher;
};

/**
 * Practice session and delivery REST routes — orchestration authority stays server-side.
 * Routes live under /api/v1/sessions per API specification.
 */
export function registerSessionRoutes(app: FastifyInstance, deps: SessionRouteDeps): void {
  app.post('/api/v1/sessions', async (request) => {
    const auth = getAuthContext(request);
    rejectClientOwnershipFields((request.body ?? {}) as Record<string, unknown>);
    const body = CreateSessionRequestSchema.parse(request.body);

    await assertPlayerMachineAccess(deps.db, auth.userId, body.machine_id);

    const session = await deps.sessionService.createSession({
      userId: auth.userId,
      machineId: body.machine_id,
      deliveryInputs: body.deliveries,
    });

    deps.eventPublisher.publishSessionStarted({
      sessionId: session.session_id,
      playerId: auth.userId,
      machineId: body.machine_id,
    });

    return { data: session };
  });

  app.get('/api/v1/sessions', async (request) => {
    const auth = getAuthContext(request);
    const sessions = await deps.sessionService.listSessions(auth.userId);
    return { data: sessions };
  });

  app.get('/api/v1/sessions/:sessionId', async (request) => {
    const auth = getAuthContext(request);
    const { sessionId } = z.object({ sessionId: z.string().uuid() }).parse(request.params);
    const session = await deps.sessionService.getSessionForUser(sessionId, auth.userId);
    return { data: session };
  });

  app.get('/api/v1/sessions/:sessionId/deliveries', async (request) => {
    const auth = getAuthContext(request);
    const { sessionId } = z.object({ sessionId: z.string().uuid() }).parse(request.params);
    const deliveries = await deps.sessionService.listDeliveriesForSession(sessionId, auth.userId);
    return { data: deliveries };
  });

  app.get('/api/v1/sessions/:sessionId/deliveries/:deliveryId', async (request) => {
    const auth = getAuthContext(request);
    const { sessionId, deliveryId } = z
      .object({ sessionId: z.string().uuid(), deliveryId: z.string().uuid() })
      .parse(request.params);
    const delivery = await deps.sessionService.getDeliveryForUser(
      sessionId,
      deliveryId,
      auth.userId,
    );
    return { data: delivery };
  });

  app.post('/api/v1/sessions/:sessionId/deliveries', async (request) => {
    const auth = getAuthContext(request);
    rejectClientOwnershipFields((request.body ?? {}) as Record<string, unknown>);
    const { sessionId } = z.object({ sessionId: z.string().uuid() }).parse(request.params);
    const body = CreateDeliveryRequestSchema.parse(request.body);

    const delivery = await deps.deliveryOrchestration.createDelivery({
      sessionId,
      userId: auth.userId,
      request: body,
    });

    return { data: delivery };
  });

  app.post('/api/v1/sessions/:sessionId/start', async (request) => {
    const auth = getAuthContext(request);
    const { sessionId } = z.object({ sessionId: z.string().uuid() }).parse(request.params);

    const delivery = await deps.deliveryOrchestration.startSession(sessionId, auth.userId);
    return { data: { delivery } };
  });

  app.post('/api/v1/sessions/:sessionId/stop', async (request) => {
    const auth = getAuthContext(request);
    const { sessionId } = z.object({ sessionId: z.string().uuid() }).parse(request.params);

    const result = await deps.deliveryOrchestration.stopSession(sessionId, auth.userId);
    return { data: result };
  });
}
