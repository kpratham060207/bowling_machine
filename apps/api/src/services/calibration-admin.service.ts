import { and, desc, eq, max } from 'drizzle-orm';
import {
  parseSimulationCalibrationData,
  validateCalibrationForActivation,
} from '@bowling-machine/calculation-engine';
import type {
  CalibrationProfileDetail,
  CalibrationProfileSummary,
  CreateCalibrationProfileRequest,
  UpdateCalibrationProfileRequest,
} from '@bowling-machine/api-contracts';
import type { Database } from '@bowling-machine/database';
import { calibrationProfiles, machines } from '@bowling-machine/database';
import { ApiHttpError } from '../errors/http-errors.js';
import { nowIso } from '../lib/machine-crypto.js';
import { writeAuditEvent } from './audit.service.js';
import type { MachineConfigurationService } from './machine-configuration.service.js';

function isSimulationData(data: Record<string, unknown>): boolean {
  return data['_simulation'] === true || parseSimulationCalibrationData(data) !== null;
}

function mapProfileSummary(
  row: typeof calibrationProfiles.$inferSelect,
): CalibrationProfileSummary {
  return {
    profile_id: row.id,
    machine_id: row.machineId,
    calibration_type: row.calibrationType,
    version: row.version,
    status: row.status,
    is_simulation: isSimulationData(row.data),
    notes: row.notes,
    created_by: row.createdBy,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

type CalibrationAdminDeps = {
  db: Database['db'];
  machineConfigurationService?: MachineConfigurationService;
};

/**
 * ADMIN calibration profile management — versioned machine-specific configuration.
 * Activation validates completeness; connected peers receive SET_CONFIGURATION push.
 */
export class CalibrationAdminService {
  constructor(private readonly deps: CalibrationAdminDeps) {}

  private get db(): Database['db'] {
    return this.deps.db;
  }

  async listProfilesForMachine(machineId: string): Promise<CalibrationProfileSummary[]> {
    const rows = await this.db
      .select()
      .from(calibrationProfiles)
      .where(eq(calibrationProfiles.machineId, machineId))
      .orderBy(desc(calibrationProfiles.version));

    return rows.map(mapProfileSummary);
  }

  async getProfile(profileId: string): Promise<CalibrationProfileDetail> {
    const row = await this.getProfileRow(profileId);
    return { ...mapProfileSummary(row), data: row.data };
  }

  async createProfile(
    adminUserId: string,
    machineId: string,
    body: CreateCalibrationProfileRequest,
  ): Promise<CalibrationProfileDetail> {
    const version = await this.nextVersion(machineId, body.calibration_type);
    const timestamp = nowIso();

    const rows = await this.db
      .insert(calibrationProfiles)
      .values({
        machineId,
        calibrationType: body.calibration_type,
        version,
        status: 'DRAFT',
        data: body.data,
        notes: body.notes ?? null,
        createdBy: adminUserId,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .returning();

    const row = rows[0];
    if (!row) {
      throw ApiHttpError.internal('Failed to create calibration profile');
    }

    await writeAuditEvent(this.db, {
      userId: adminUserId,
      action: 'calibration.profile.created',
      resourceType: 'calibration_profile',
      resourceId: row.id,
      details: { machine_id: machineId, version, calibration_type: body.calibration_type },
    });

    return { ...mapProfileSummary(row), data: row.data };
  }

  async updateProfile(
    adminUserId: string,
    profileId: string,
    body: UpdateCalibrationProfileRequest,
  ): Promise<CalibrationProfileDetail> {
    const existing = await this.getProfileRow(profileId);
    if (existing.status === 'ARCHIVED') {
      throw ApiHttpError.conflict('Archived calibration profiles cannot be edited');
    }

    const rows = await this.db
      .update(calibrationProfiles)
      .set({
        data: body.data ?? existing.data,
        notes: body.notes ?? existing.notes,
        updatedAt: nowIso(),
      })
      .where(eq(calibrationProfiles.id, profileId))
      .returning();

    const row = rows[0];
    if (!row) {
      throw ApiHttpError.notFound('Calibration profile not found');
    }

    await writeAuditEvent(this.db, {
      userId: adminUserId,
      action: 'calibration.profile.updated',
      resourceType: 'calibration_profile',
      resourceId: profileId,
      details: { machine_id: row.machineId },
    });

    return { ...mapProfileSummary(row), data: row.data };
  }

  /** Activates a profile after validation; pushes SET_CONFIGURATION when peer is connected. */
  async activateProfile(
    adminUserId: string,
    profileId: string,
  ): Promise<
    CalibrationProfileDetail & { configuration_push?: { pushed: boolean; message: string } }
  > {
    const profile = await this.getProfileRow(profileId);

    const machineRows = await this.db
      .select({ kind: machines.kind })
      .from(machines)
      .where(eq(machines.id, profile.machineId))
      .limit(1);

    const machineKind = machineRows[0]?.kind ?? 'SIMULATOR';
    const validation = validateCalibrationForActivation(profile.data, machineKind);

    if (!validation.valid) {
      throw ApiHttpError.validation('Calibration profile cannot be activated', {
        errors: validation.errors,
        machine_kind: machineKind,
      });
    }

    await this.db.transaction(async (tx) => {
      await tx
        .update(calibrationProfiles)
        .set({ status: 'ARCHIVED', updatedAt: nowIso() })
        .where(
          and(
            eq(calibrationProfiles.machineId, profile.machineId),
            eq(calibrationProfiles.calibrationType, profile.calibrationType),
            eq(calibrationProfiles.status, 'ACTIVE'),
          ),
        );

      await tx
        .update(calibrationProfiles)
        .set({ status: 'ACTIVE', updatedAt: nowIso() })
        .where(eq(calibrationProfiles.id, profileId));
    });

    await writeAuditEvent(this.db, {
      userId: adminUserId,
      action: 'calibration.profile.activated',
      resourceType: 'calibration_profile',
      resourceId: profileId,
      details: {
        machine_id: profile.machineId,
        calibration_type: profile.calibrationType,
        version: profile.version,
        is_simulation: validation.is_simulation,
        is_hardware: validation.is_hardware,
      },
    });

    let configuration_push: { pushed: boolean; message: string } | undefined;
    if (this.deps.machineConfigurationService) {
      configuration_push = await this.deps.machineConfigurationService.pushCalibrationProfile(
        profile.machineId,
        {
          calibration_type: profile.calibrationType,
          version: profile.version,
          data: profile.data,
        },
      );
    }

    return {
      ...(await this.getProfile(profileId)),
      configuration_push,
    };
  }

  private async getProfileRow(profileId: string): Promise<typeof calibrationProfiles.$inferSelect> {
    const rows = await this.db
      .select()
      .from(calibrationProfiles)
      .where(eq(calibrationProfiles.id, profileId))
      .limit(1);

    const row = rows[0];
    if (!row) {
      throw ApiHttpError.notFound('Calibration profile not found');
    }
    return row;
  }

  private async nextVersion(machineId: string, calibrationType: string): Promise<number> {
    const rows = await this.db
      .select({ maxVersion: max(calibrationProfiles.version) })
      .from(calibrationProfiles)
      .where(
        and(
          eq(calibrationProfiles.machineId, machineId),
          eq(calibrationProfiles.calibrationType, calibrationType),
        ),
      );

    return (rows[0]?.maxVersion ?? 0) + 1;
  }
}
