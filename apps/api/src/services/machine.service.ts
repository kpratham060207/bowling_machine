import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { MachineIdentity, MachineKind, MachineStatus } from '@bowling-machine/api-contracts';
import type { Database } from '@bowling-machine/database';
import {
  machineAccess,
  machineControlLocks,
  machineRegistrations,
  machines,
} from '@bowling-machine/database';
import { ApiHttpError } from '../errors/http-errors.js';
import { addMilliseconds, isExpired, nowIso } from '../lib/machine-crypto.js';
import type { MachineGateway } from '../gateway/types.js';

/** Default machine status when no live telemetry is available yet. */
export function createDefaultMachineStatus(machineId: string, kind: MachineKind): MachineStatus {
  const timestamp = nowIso();
  return {
    machine_id: machineId,
    timestamp,
    kind,
    connection_status: 'DISCONNECTED',
    state: 'OFF',
    active_command_id: null,
    active_delivery_id: null,
    wheel1_current_rpm: null,
    wheel2_current_rpm: null,
    wheel1_target_rpm: null,
    wheel2_target_rpm: null,
    actuator_current_positions: [null, null, null, null],
    actuator_target_positions: [null, null, null, null],
    feeder_status: 'UNKNOWN',
    homing_status: 'UNKNOWN',
    emergency_stop_active: false,
    active_fault: null,
  };
}

/** Maps a machines table row to the shared MachineIdentity contract. */
export function toMachineIdentity(row: typeof machines.$inferSelect): MachineIdentity {
  return {
    machine_id: row.id,
    name: row.name,
    serial_number: row.serialNumber,
    registry_status: row.registryStatus,
    kind: row.kind,
    protocol_version: row.protocolVersion as '1.0',
    firmware_version: row.lastKnownFirmwareVersion ?? undefined,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export class MachineService {
  constructor(
    private readonly db: Database['db'],
    private readonly gateway: MachineGateway,
    private readonly controlLockTtlMs: number,
  ) {}

  async getMachineById(machineId: string): Promise<typeof machines.$inferSelect> {
    const rows = await this.db.select().from(machines).where(eq(machines.id, machineId)).limit(1);
    const machine = rows[0];
    if (!machine || machine.deletedAt) {
      throw ApiHttpError.notFound('Machine not found');
    }
    return machine;
  }

  async getMachineIdentity(machineId: string): Promise<MachineIdentity> {
    return toMachineIdentity(await this.getMachineById(machineId));
  }

  async listAccessibleMachines(userId: string): Promise<MachineIdentity[]> {
    const rows = await this.db
      .select()
      .from(machines)
      .innerJoin(machineAccess, eq(machineAccess.machineId, machines.id))
      .where(eq(machineAccess.userId, userId));

    return rows
      .filter(({ machines: machine }) => !machine.deletedAt)
      .map(({ machines: machine }) => toMachineIdentity(machine));
  }

  /** Resolves QR token to machine id — QR carries no secrets (UD-21 provisional). */
  async resolveMachineFromQrToken(qrToken: string): Promise<string> {
    const registration = await this.db
      .select({ machineId: machineRegistrations.machineId })
      .from(machineRegistrations)
      .where(eq(machineRegistrations.qrCodeToken, qrToken))
      .limit(1);

    const row = registration[0];
    if (!row) {
      throw ApiHttpError.notFound('Unknown machine QR token');
    }
    return row.machineId;
  }

  getLiveStatus(machineId: string): MachineStatus {
    return this.gateway.getMachineStatus(machineId);
  }

  /** Acquire exclusive control lock — rejects if another player holds an unexpired lock. */
  async acquireControl(
    userId: string,
    machineId: string,
  ): Promise<{
    connectionId: string;
    acquiredAt: string;
    expiresAt: string;
  }> {
    const now = nowIso();
    const expiresAt = addMilliseconds(now, this.controlLockTtlMs);
    const connectionId = randomUUID();

    const existing = await this.db
      .select()
      .from(machineControlLocks)
      .where(eq(machineControlLocks.machineId, machineId))
      .limit(1);

    const current = existing[0];
    const lockActive = current && !current.releasedAt && !isExpired(current.expiresAt);

    if (lockActive && current.userId !== userId) {
      throw ApiHttpError.conflict('Machine is currently controlled by another player', {
        machine_id: machineId,
        expires_at: current.expiresAt,
      });
    }

    if (lockActive && current.userId === userId) {
      await this.db
        .update(machineControlLocks)
        .set({ expiresAt, connectionId, acquiredAt: now, releasedAt: null })
        .where(eq(machineControlLocks.machineId, machineId));

      return { connectionId, acquiredAt: now, expiresAt };
    }

    await this.db
      .insert(machineControlLocks)
      .values({
        machineId,
        userId,
        connectionId,
        acquiredAt: now,
        expiresAt,
        releasedAt: null,
      })
      .onConflictDoUpdate({
        target: machineControlLocks.machineId,
        set: {
          userId,
          connectionId,
          acquiredAt: now,
          expiresAt,
          releasedAt: null,
        },
      });

    return { connectionId, acquiredAt: now, expiresAt };
  }

  /** Release control lock — only the lock owner may release (unless expired). */
  async releaseControl(
    userId: string,
    machineId: string,
    connectionId?: string,
  ): Promise<{ releasedAt: string }> {
    const lock = await this.db
      .select()
      .from(machineControlLocks)
      .where(eq(machineControlLocks.machineId, machineId))
      .limit(1);

    const current = lock[0];
    if (!current || current.releasedAt) {
      return { releasedAt: nowIso() };
    }

    const expired = isExpired(current.expiresAt);
    if (!expired && current.userId !== userId) {
      throw ApiHttpError.forbidden('You do not hold the control lock for this machine');
    }

    if (!expired && connectionId && current.connectionId !== connectionId) {
      throw ApiHttpError.conflict('Control connection id does not match active lock');
    }

    const releasedAt = nowIso();
    await this.db
      .update(machineControlLocks)
      .set({ releasedAt, expiresAt: releasedAt })
      .where(eq(machineControlLocks.machineId, machineId));

    return { releasedAt };
  }

  /** Ensures player holds an active, unexpired control lock before machine commands. */
  async assertActiveControl(userId: string, machineId: string): Promise<void> {
    const lock = await this.db
      .select()
      .from(machineControlLocks)
      .where(eq(machineControlLocks.machineId, machineId))
      .limit(1);

    const current = lock[0];
    if (!current || current.releasedAt || isExpired(current.expiresAt)) {
      throw ApiHttpError.conflict('Machine control lock required — acquire control first', {
        machine_id: machineId,
      });
    }

    if (current.userId !== userId) {
      throw ApiHttpError.forbidden('Another player holds the control lock for this machine');
    }
  }

  async getControlSummary(
    machineId: string,
    userId: string,
  ): Promise<{
    connectionId: string;
    acquiredAt: string;
    expiresAt: string;
    isOwner: boolean;
  } | null> {
    const lock = await this.db
      .select()
      .from(machineControlLocks)
      .where(eq(machineControlLocks.machineId, machineId))
      .limit(1);

    const current = lock[0];
    if (!current || current.releasedAt || isExpired(current.expiresAt)) {
      return null;
    }

    return {
      connectionId: current.connectionId,
      acquiredAt: current.acquiredAt,
      expiresAt: current.expiresAt,
      isOwner: current.userId === userId,
    };
  }
}
