import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { MachineDiscoveryRequestSchema } from '@bowling-machine/api-contracts';
import type { Database } from '@bowling-machine/database';
import { getAuthContext } from '../auth/middleware.js';
import { rejectClientOwnershipFields } from '../auth/authorization.js';
import { assertPlayerMachineAccess } from '../services/machine-access.service.js';
import { type MachineService } from '../services/machine.service.js';
import { type MachineCommandService } from '../services/machine-command.service.js';

type MachineRouteDeps = {
  db: Database['db'];
  machineService: MachineService;
  commandService: MachineCommandService;
};

/**
 * Machine REST routes — all protected routes require authentication + machine_access.
 * Control lock is required before stop/home/command operations.
 */
export function registerMachineRoutes(app: FastifyInstance, deps: MachineRouteDeps): void {
  app.get('/machines', async (request) => {
    const auth = getAuthContext(request);
    const machines = await deps.machineService.listAccessibleMachines(auth.userId);

    const summaries = await Promise.all(
      machines.map(async (machine) => {
        const control = await deps.machineService.getControlSummary(
          machine.machine_id,
          auth.userId,
        );
        return {
          ...machine,
          has_control: control?.isOwner ?? false,
          control_expires_at: control?.expiresAt ?? null,
        };
      }),
    );

    return { data: summaries };
  });

  app.get('/machines/:id', async (request) => {
    const auth = getAuthContext(request);
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    await assertPlayerMachineAccess(deps.db, auth.userId, id);

    const machine = await deps.machineService.getMachineIdentity(id);
    const status = deps.machineService.getLiveStatus(id);
    const control = await deps.machineService.getControlSummary(id, auth.userId);

    return {
      data: {
        machine,
        status,
        control: control
          ? {
              connection_id: control.connectionId,
              acquired_at: control.acquiredAt,
              expires_at: control.expiresAt,
              is_owner: control.isOwner,
            }
          : null,
      },
    };
  });

  app.get('/machines/:id/status', async (request) => {
    const auth = getAuthContext(request);
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    await assertPlayerMachineAccess(deps.db, auth.userId, id);

    return { data: deps.machineService.getLiveStatus(id) };
  });

  app.post('/machines/connect', async (request) => {
    const auth = getAuthContext(request);
    rejectClientOwnershipFields((request.body ?? {}) as Record<string, unknown>);
    const body = MachineDiscoveryRequestSchema.parse(request.body);

    const machineId = await deps.machineService.resolveMachineFromQrToken(body.qr_token);
    await assertPlayerMachineAccess(deps.db, auth.userId, machineId);

    const machine = await deps.machineService.getMachineIdentity(machineId);
    const status = deps.machineService.getLiveStatus(machineId);

    return {
      data: {
        machine_id: machineId,
        name: machine.name,
        status: status.state,
        connection_id: machineId,
        connection_status: status.connection_status,
      },
    };
  });

  app.post('/machines/:id/control/acquire', async (request) => {
    const auth = getAuthContext(request);
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    await assertPlayerMachineAccess(deps.db, auth.userId, id);

    const lock = await deps.machineService.acquireControl(auth.userId, id);
    return {
      data: {
        machine_id: id,
        connection_id: lock.connectionId,
        acquired_at: lock.acquiredAt,
        expires_at: lock.expiresAt,
      },
    };
  });

  app.post('/machines/:id/control/release', async (request) => {
    const auth = getAuthContext(request);
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    await assertPlayerMachineAccess(deps.db, auth.userId, id);

    const body = z
      .object({ connection_id: z.string().uuid().optional() })
      .optional()
      .parse(request.body);

    const released = await deps.machineService.releaseControl(auth.userId, id, body?.connection_id);
    return { data: { machine_id: id, released_at: released.releasedAt } };
  });

  app.post('/machines/:id/stop', async (request) => {
    const auth = getAuthContext(request);
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    await assertPlayerMachineAccess(deps.db, auth.userId, id);
    await deps.machineService.assertActiveControl(auth.userId, id);

    const command = deps.commandService.buildCommand(id, 'STOP', {});
    const result = await deps.commandService.dispatch(command);
    return { data: result };
  });

  app.post('/machines/:id/home', async (request) => {
    const auth = getAuthContext(request);
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    await assertPlayerMachineAccess(deps.db, auth.userId, id);
    await deps.machineService.assertActiveControl(auth.userId, id);

    const command = deps.commandService.buildCommand(id, 'HOME', {});
    const result = await deps.commandService.dispatch(command);
    return { data: result };
  });

  app.post('/machines/:id/disconnect', async (request) => {
    const auth = getAuthContext(request);
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    await assertPlayerMachineAccess(deps.db, auth.userId, id);
    await deps.machineService.releaseControl(auth.userId, id);

    return {
      data: {
        machine_id: id,
        disconnected_at: new Date().toISOString(),
      },
    };
  });
}
