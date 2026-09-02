import { randomBytes, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { AdminMachineDetail, MachineRegistrationSecret } from '@bowling-machine/api-contracts';
import type { Database } from '@bowling-machine/database';
import { calibrationProfiles, machineRegistrations, machines } from '@bowling-machine/database';
import { ApiHttpError } from '../errors/http-errors.js';
import { hashMachineConnectionSecret, nowIso } from '../lib/machine-crypto.js';
import type { DefaultMachineGateway } from '../gateway/machine-gateway.js';
import { writeAuditEvent } from './audit.service.js';

function mapProfileSummary(row: typeof calibrationProfiles.$inferSelect) {
  return {
    profile_id: row.id,
    machine_id: row.machineId,
    calibration_type: row.calibrationType,
    version: row.version,
    status: row.status,
    is_simulation: row.data['_simulation'] === true,
    notes: row.notes,
    created_by: row.createdBy,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

/**
 * ADMIN machine inspection — identity, connectivity, calibration, faults.
 * Never exposes connection secrets or raw peer credentials.
 */
export class MachineAdminService {
  constructor(
    private readonly db: Database['db'],
    private readonly gateway: DefaultMachineGateway,
  ) {}

  async getMachineDetail(machineId: string): Promise<AdminMachineDetail> {
    const machineRows = await this.db
      .select()
      .from(machines)
      .where(eq(machines.id, machineId))
      .limit(1);

    const machine = machineRows[0];
    if (!machine) {
      throw ApiHttpError.notFound('Machine not found');
    }

    const liveStatus = this.gateway.getMachineStatus(machineId);
    const peerConnected = this.gateway.isMachineConnected(machineId);

    const activeCalibrationRows = await this.db
      .select()
      .from(calibrationProfiles)
      .where(eq(calibrationProfiles.machineId, machineId))
      .orderBy(calibrationProfiles.version);

    const activeCalibration = activeCalibrationRows.find((row) => row.status === 'ACTIVE') ?? null;

    return {
      machine_id: machine.id,
      name: machine.name,
      serial_number: machine.serialNumber,
      kind: machine.kind,
      registry_status: machine.registryStatus,
      protocol_version: machine.protocolVersion,
      last_known_firmware_version: machine.lastKnownFirmwareVersion,
      connection_status: liveStatus.connection_status,
      machine_state: liveStatus.state,
      is_connected: peerConnected,
      last_heartbeat_at: peerConnected ? liveStatus.timestamp : null,
      active_calibration: activeCalibration ? mapProfileSummary(activeCalibration) : null,
      active_fault: liveStatus.active_fault,
      emergency_stop_active: liveStatus.emergency_stop_active,
    };
  }

  /**
   * Creates or replaces machine peer registration credentials.
   * Plaintext secret is returned once — never logged or stored.
   */
  async createMachineRegistration(
    adminUserId: string,
    machineId: string,
  ): Promise<MachineRegistrationSecret> {
    const machineRows = await this.db
      .select({ id: machines.id })
      .from(machines)
      .where(eq(machines.id, machineId))
      .limit(1);

    if (machineRows.length === 0) {
      throw ApiHttpError.notFound('Machine not found');
    }

    const connectionSecret = randomBytes(32).toString('base64url');
    const qrCodeToken = `qr-${randomUUID()}`;
    const timestamp = nowIso();

    await this.db.delete(machineRegistrations).where(eq(machineRegistrations.machineId, machineId));

    await this.db.insert(machineRegistrations).values({
      machineId,
      qrCodeToken,
      connectionSecretHash: hashMachineConnectionSecret(connectionSecret),
      createdAt: timestamp,
    });

    await writeAuditEvent(this.db, {
      userId: adminUserId,
      action: 'machine.registration.created',
      resourceType: 'machine',
      resourceId: machineId,
      details: { qr_code_token: qrCodeToken },
    });

    return {
      machine_id: machineId,
      qr_code_token: qrCodeToken,
      connection_secret: connectionSecret,
      created_at: timestamp,
    };
  }
}
