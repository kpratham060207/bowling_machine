import { and, eq, isNull } from 'drizzle-orm';
import type { Database } from '@bowling-machine/database';
import { machineAccess, machines } from '@bowling-machine/database';
import { ApiHttpError } from '../errors/http-errors.js';

/**
 * Verifies a player has been granted access to a machine via machine_access.
 * Admins bypass machine_access checks for management operations only when explicitly allowed.
 */
export async function assertPlayerMachineAccess(
  db: Database['db'],
  userId: string,
  machineId: string,
): Promise<void> {
  const machine = await db
    .select({
      id: machines.id,
      deletedAt: machines.deletedAt,
      registryStatus: machines.registryStatus,
    })
    .from(machines)
    .where(eq(machines.id, machineId))
    .limit(1);

  if (machine.length === 0 || machine[0]?.deletedAt) {
    throw ApiHttpError.notFound('Machine not found');
  }

  if (machine[0]?.registryStatus !== 'ACTIVE') {
    throw ApiHttpError.conflict('Machine is not available', { machine_id: machineId });
  }

  const access = await db
    .select({ id: machineAccess.id })
    .from(machineAccess)
    .where(and(eq(machineAccess.userId, userId), eq(machineAccess.machineId, machineId)))
    .limit(1);

  if (access.length === 0) {
    throw ApiHttpError.forbidden('You do not have access to this machine');
  }
}

/** Returns machine IDs the player may access (active registry only). */
export async function listAccessibleMachineIds(
  db: Database['db'],
  userId: string,
): Promise<string[]> {
  const rows = await db
    .select({ machineId: machineAccess.machineId })
    .from(machineAccess)
    .innerJoin(machines, eq(machines.id, machineAccess.machineId))
    .where(and(eq(machineAccess.userId, userId), isNull(machines.deletedAt)));

  return rows.map((row) => row.machineId);
}
