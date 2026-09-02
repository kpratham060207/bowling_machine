import { and, eq } from 'drizzle-orm';
import type { Database } from '@bowling-machine/database';
import { deliveries, practicePlans, practiceSessions } from '@bowling-machine/database';
import { ApiHttpError } from '../errors/http-errors.js';

/**
 * Ownership enforcement helpers for player-private resources.
 *
 * Future session/delivery/plan routes MUST call these before returning data.
 * Identity always comes from authenticated session — never from client-supplied IDs alone.
 */

export async function assertSessionOwnership(
  db: Database['db'],
  sessionId: string,
  authenticatedUserId: string,
): Promise<{ id: string; userId: string }> {
  const rows = await db
    .select()
    .from(practiceSessions)
    .where(
      and(eq(practiceSessions.id, sessionId), eq(practiceSessions.userId, authenticatedUserId)),
    )
    .limit(1);

  const session = rows[0];
  if (!session) {
    throw ApiHttpError.forbidden('You do not have access to this practice session');
  }

  return { id: session.id, userId: session.userId };
}

export async function assertDeliveryOwnership(
  db: Database['db'],
  deliveryId: string,
  authenticatedUserId: string,
): Promise<{ id: string; sessionId: string }> {
  const rows = await db
    .select({
      deliveryId: deliveries.id,
      sessionId: deliveries.sessionId,
      sessionUserId: practiceSessions.userId,
    })
    .from(deliveries)
    .innerJoin(practiceSessions, eq(deliveries.sessionId, practiceSessions.id))
    .where(eq(deliveries.id, deliveryId))
    .limit(1);

  const row = rows[0];
  if (!row || row.sessionUserId !== authenticatedUserId) {
    throw ApiHttpError.forbidden('You do not have access to this delivery');
  }

  return { id: row.deliveryId, sessionId: row.sessionId };
}

export async function assertPlanOwnership(
  db: Database['db'],
  planId: string,
  authenticatedUserId: string,
): Promise<{ id: string; userId: string }> {
  const rows = await db
    .select()
    .from(practicePlans)
    .where(and(eq(practicePlans.id, planId), eq(practicePlans.userId, authenticatedUserId)))
    .limit(1);

  const plan = rows[0];
  if (!plan) {
    throw ApiHttpError.forbidden('You do not have access to this practice plan');
  }

  return { id: plan.id, userId: plan.userId };
}

/**
 * Verifies a profile belongs to the authenticated user before update/read by profile row id.
 * Profile routes use userId from auth context directly; this guards future admin cross-access.
 */
export function assertProfileOwnershipByUserId(
  authenticatedUserId: string,
  requestedUserId: string,
): void {
  if (authenticatedUserId !== requestedUserId) {
    throw ApiHttpError.forbidden('You do not have access to this player profile');
  }
}
