import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  CreateCalibrationProfileRequestSchema,
  UpdateCalibrationProfileRequestSchema,
} from '@bowling-machine/api-contracts';
import type { Database } from '@bowling-machine/database';
import { machines } from '@bowling-machine/database';
import { getAuthContext } from '../auth/middleware.js';
import { rejectClientOwnershipFields } from '../auth/authorization.js';
import type { CalibrationAdminService } from '../services/calibration-admin.service.js';
import type { MachineAdminService } from '../services/machine-admin.service.js';

type AdminRouteDeps = {
  db: Database['db'];
  calibrationAdminService: CalibrationAdminService;
  machineAdminService: MachineAdminService;
};

/**
 * ADMIN routes — calibration management and status checks.
 * Calibration changes are audited; no raw motor commands are exposed.
 */
export function registerAdminRoutes(app: FastifyInstance, deps: AdminRouteDeps): void {
  app.get('/api/v1/admin/machines', async () => {
    const rows = await deps.db
      .select({
        machine_id: machines.id,
        name: machines.name,
        kind: machines.kind,
        registry_status: machines.registryStatus,
      })
      .from(machines);

    return { data: rows };
  });

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

  app.get('/api/v1/admin/machines/:machineId', async (request) => {
    const { machineId } = z.object({ machineId: z.string().uuid() }).parse(request.params);
    const detail = await deps.machineAdminService.getMachineDetail(machineId);
    return { data: detail };
  });

  app.post('/api/v1/admin/machines/:machineId/registration', async (request) => {
    const auth = getAuthContext(request);
    const { machineId } = z.object({ machineId: z.string().uuid() }).parse(request.params);
    const registration = await deps.machineAdminService.createMachineRegistration(
      auth.userId,
      machineId,
    );
    return { data: registration };
  });

  app.get('/api/v1/admin/machines/:machineId/calibration', async (request) => {
    const { machineId } = z.object({ machineId: z.string().uuid() }).parse(request.params);
    const profiles = await deps.calibrationAdminService.listProfilesForMachine(machineId);
    return { data: profiles };
  });

  app.get('/api/v1/admin/calibration/:profileId', async (request) => {
    const { profileId } = z.object({ profileId: z.string().uuid() }).parse(request.params);
    const profile = await deps.calibrationAdminService.getProfile(profileId);
    return { data: profile };
  });

  app.post('/api/v1/admin/machines/:machineId/calibration', async (request) => {
    const auth = getAuthContext(request);
    rejectClientOwnershipFields((request.body ?? {}) as Record<string, unknown>);
    const { machineId } = z.object({ machineId: z.string().uuid() }).parse(request.params);
    const body = CreateCalibrationProfileRequestSchema.parse(request.body);
    const profile = await deps.calibrationAdminService.createProfile(auth.userId, machineId, body);
    return { data: profile };
  });

  app.put('/api/v1/admin/calibration/:profileId', async (request) => {
    const auth = getAuthContext(request);
    rejectClientOwnershipFields((request.body ?? {}) as Record<string, unknown>);
    const { profileId } = z.object({ profileId: z.string().uuid() }).parse(request.params);
    const body = UpdateCalibrationProfileRequestSchema.parse(request.body);
    const profile = await deps.calibrationAdminService.updateProfile(auth.userId, profileId, body);
    return { data: profile };
  });

  app.post('/api/v1/admin/calibration/:profileId/activate', async (request) => {
    const auth = getAuthContext(request);
    const { profileId } = z.object({ profileId: z.string().uuid() }).parse(request.params);
    const profile = await deps.calibrationAdminService.activateProfile(auth.userId, profileId);
    return { data: profile };
  });
}
