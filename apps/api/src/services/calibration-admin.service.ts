import { and, desc, eq, max } from 'drizzle-orm';
import { parseSimulationCalibrationData } from '@bowling-machine/calculation-engine';
import type {
  CalibrationProfileDetail,
  CalibrationProfileSummary,
  CreateCalibrationProfileRequest,
  UpdateCalibrationProfileRequest,
} from '@bowling-machine/api-contracts';
import type { Database } from '@bowling-machine/database';
import { calibrationProfiles } from '@bowling-machine/database';
import { ApiHttpError } from '../errors/http-errors.js';
import { nowIso } from '../lib/machine-crypto.js';
import { writeAuditEvent } from './audit.service.js';

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

/**
 * ADMIN calibration profile management — versioned machine-specific configuration.
 * Changes are audited; activation is explicit and does not bypass safety validation.
 */
export class CalibrationAdminService {
  constructor(private readonly db: Database['db']) {}

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

  /** Activates a profile and archives other ACTIVE profiles of the same machine + type. */
  async activateProfile(adminUserId: string, profileId: string): Promise<CalibrationProfileDetail> {
    const profile = await this.getProfileRow(profileId);

    if (!isSimulationData(profile.data) && profile.data['_simulation'] !== true) {
      // Non-simulation profiles must parse as valid simulation structure for MVP engine,
      // or will fail calculation until production calibration format is defined.
      if (!parseSimulationCalibrationData(profile.data)) {
        throw ApiHttpError.validation(
          'Calibration data is not valid — simulation profiles require _simulation: true and required fields',
        );
      }
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
        is_simulation: isSimulationData(profile.data),
      },
    });

    return this.getProfile(profileId);
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
