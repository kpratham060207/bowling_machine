import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  CreatePracticePlanRequestSchema,
  StartPracticePlanRequestSchema,
  UpdatePracticePlanRequestSchema,
} from '@bowling-machine/api-contracts';
import type { Database } from '@bowling-machine/database';
import { getAuthContext } from '../auth/middleware.js';
import { rejectClientOwnershipFields } from '../auth/authorization.js';
import { assertPlayerMachineAccess } from '../services/machine-access.service.js';
import type { PracticePlanService } from '../services/practice-plan.service.js';
import type { SessionService } from '../services/session.service.js';
import { planDeliveriesToSessionInputs } from '../services/practice-plan.mapper.js';
import type { OrchestrationEventPublisher } from '../services/orchestration-event-publisher.js';

type PracticePlanRouteDeps = {
  db: Database['db'];
  practicePlanService: PracticePlanService;
  sessionService: SessionService;
  eventPublisher: OrchestrationEventPublisher;
};

/**
 * Player practice plan routes — reusable high-level delivery templates.
 * Starting a plan creates a new session snapshot; later plan edits do not mutate past sessions.
 */
export function registerPracticePlanRoutes(
  app: FastifyInstance,
  deps: PracticePlanRouteDeps,
): void {
  app.post('/api/v1/practice-plans', async (request) => {
    const auth = getAuthContext(request);
    rejectClientOwnershipFields((request.body ?? {}) as Record<string, unknown>);
    const body = CreatePracticePlanRequestSchema.parse(request.body);
    const plan = await deps.practicePlanService.createPlan(auth.userId, body);
    return { data: plan };
  });

  app.get('/api/v1/practice-plans', async (request) => {
    const auth = getAuthContext(request);
    const plans = await deps.practicePlanService.listPlans(auth.userId);
    return { data: plans };
  });

  app.get('/api/v1/practice-plans/:planId', async (request) => {
    const auth = getAuthContext(request);
    const { planId } = z.object({ planId: z.string().uuid() }).parse(request.params);
    const plan = await deps.practicePlanService.getPlanForUser(planId, auth.userId);
    return { data: plan };
  });

  app.put('/api/v1/practice-plans/:planId', async (request) => {
    const auth = getAuthContext(request);
    rejectClientOwnershipFields((request.body ?? {}) as Record<string, unknown>);
    const { planId } = z.object({ planId: z.string().uuid() }).parse(request.params);
    const body = UpdatePracticePlanRequestSchema.parse(request.body);
    const plan = await deps.practicePlanService.updatePlan(auth.userId, planId, body);
    return { data: plan };
  });

  app.delete('/api/v1/practice-plans/:planId', async (request) => {
    const auth = getAuthContext(request);
    const { planId } = z.object({ planId: z.string().uuid() }).parse(request.params);
    await deps.practicePlanService.deletePlan(auth.userId, planId);
    return { data: { deleted: true } };
  });

  /** Copies plan deliveries into a new session snapshot — normal Phase 1G orchestration applies. */
  app.post('/api/v1/practice-plans/:planId/start', async (request) => {
    const auth = getAuthContext(request);
    rejectClientOwnershipFields((request.body ?? {}) as Record<string, unknown>);
    const { planId } = z.object({ planId: z.string().uuid() }).parse(request.params);
    const body = StartPracticePlanRequestSchema.parse(request.body);

    await assertPlayerMachineAccess(deps.db, auth.userId, body.machine_id);

    const plan = await deps.practicePlanService.getPlanForUser(planId, auth.userId);
    const deliveryInputs = planDeliveriesToSessionInputs(plan.deliveries);

    const session = await deps.sessionService.createSession({
      userId: auth.userId,
      machineId: body.machine_id,
      deliveryInputs,
      sourcePlanId: plan.plan_id,
    });

    deps.eventPublisher.publishSessionStarted({
      sessionId: session.session_id,
      playerId: auth.userId,
      machineId: body.machine_id,
    });

    return { data: session };
  });
}
