import { randomUUID } from 'node:crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { PracticeSession as PracticeSessionContract } from '@bowling-machine/api-contracts';
import type { CreateSessionDeliveryInput } from '@bowling-machine/api-contracts';
import type { Database } from '@bowling-machine/database';
import { deliveries, practiceSessions } from '@bowling-machine/database';
import { ApiHttpError } from '../errors/http-errors.js';
import { nowIso } from '../lib/machine-crypto.js';
import { assertSessionOwnership } from './ownership.service.js';
import { mapDeliveryRowToContract } from './delivery.mapper.js';

/**
 * Practice session persistence — groups deliveries for one player on one machine.
 * Session status reflects application lifecycle, not machine runtime state.
 */
export class SessionService {
  constructor(private readonly db: Database['db']) {}

  async createSession(input: {
    userId: string;
    machineId: string;
    deliveryInputs?: CreateSessionDeliveryInput[];
  }): Promise<PracticeSessionContract> {
    const totalBallsPlanned =
      input.deliveryInputs?.reduce((sum, delivery) => sum + delivery.number_of_balls, 0) ?? 0;

    const sessionId = randomUUID();
    const startedAt = nowIso();

    await this.db.transaction(async (tx) => {
      await tx.insert(practiceSessions).values({
        id: sessionId,
        userId: input.userId,
        machineId: input.machineId,
        status: 'ACTIVE',
        startedAt,
        totalBallsPlanned,
        totalBallsDelivered: 0,
      });

      if (input.deliveryInputs?.length) {
        for (const [index, deliveryInput] of input.deliveryInputs.entries()) {
          await tx.insert(deliveries).values({
            sessionId,
            sequenceNumber: index + 1,
            targetX: String(deliveryInput.target_x),
            targetY: String(deliveryInput.target_y),
            desiredSpeedKmh: String(deliveryInput.desired_speed_kmh),
            ballType: deliveryInput.ball_type,
            numberOfBalls: deliveryInput.number_of_balls,
            firstBallDelayMs: deliveryInput.first_ball_delay_ms,
            intervalMs: deliveryInput.interval_ms,
            uiX: deliveryInput.ui ? String(deliveryInput.ui.ui_x) : null,
            uiY: deliveryInput.ui ? String(deliveryInput.ui.ui_y) : null,
            status: 'PENDING',
          });
        }
      }
    });

    return this.getSessionForUser(sessionId, input.userId);
  }

  async listSessions(userId: string): Promise<PracticeSessionContract[]> {
    const rows = await this.db
      .select()
      .from(practiceSessions)
      .where(eq(practiceSessions.userId, userId))
      .orderBy(desc(practiceSessions.startedAt));

    return Promise.all(rows.map((row) => this.buildSessionContract(row.id, row.userId)));
  }

  async getSessionForUser(sessionId: string, userId: string): Promise<PracticeSessionContract> {
    await assertSessionOwnership(this.db, sessionId, userId);
    return this.buildSessionContract(sessionId, userId);
  }

  async listDeliveriesForSession(
    sessionId: string,
    userId: string,
  ): Promise<ReturnType<typeof mapDeliveryRowToContract>[]> {
    await assertSessionOwnership(this.db, sessionId, userId);
    const rows = await this.db
      .select()
      .from(deliveries)
      .where(eq(deliveries.sessionId, sessionId))
      .orderBy(deliveries.sequenceNumber);

    return rows.map(mapDeliveryRowToContract);
  }

  async getDeliveryForUser(
    sessionId: string,
    deliveryId: string,
    userId: string,
  ): Promise<ReturnType<typeof mapDeliveryRowToContract>> {
    await assertSessionOwnership(this.db, sessionId, userId);
    const rows = await this.db
      .select()
      .from(deliveries)
      .where(and(eq(deliveries.id, deliveryId), eq(deliveries.sessionId, sessionId)))
      .limit(1);

    const row = rows[0];
    if (!row) {
      throw ApiHttpError.notFound('Delivery not found');
    }

    return mapDeliveryRowToContract(row);
  }

  async getSessionRow(sessionId: string): Promise<typeof practiceSessions.$inferSelect> {
    const rows = await this.db
      .select()
      .from(practiceSessions)
      .where(eq(practiceSessions.id, sessionId))
      .limit(1);

    const row = rows[0];
    if (!row) {
      throw ApiHttpError.notFound('Practice session not found');
    }
    return row;
  }

  async updateSessionStatus(
    sessionId: string,
    status: typeof practiceSessions.$inferSelect.status,
    updates?: { totalBallsDelivered?: number },
  ): Promise<void> {
    const endedAt = status === 'COMPLETED' || status === 'CANCELLED' ? nowIso() : undefined;

    await this.db
      .update(practiceSessions)
      .set({
        status,
        endedAt,
        updatedAt: nowIso(),
        ...(updates?.totalBallsDelivered !== undefined
          ? { totalBallsDelivered: updates.totalBallsDelivered }
          : {}),
      })
      .where(eq(practiceSessions.id, sessionId));
  }

  /** Increments delivered ball count when a delivery completes successfully. */
  async incrementBallsDelivered(sessionId: string, ballCount: number): Promise<void> {
    await this.db
      .update(practiceSessions)
      .set({
        totalBallsDelivered: sql`${practiceSessions.totalBallsDelivered} + ${ballCount}`,
        updatedAt: nowIso(),
      })
      .where(eq(practiceSessions.id, sessionId));
  }

  private async buildSessionContract(
    sessionId: string,
    userId: string,
  ): Promise<PracticeSessionContract> {
    const session = await this.getSessionRow(sessionId);
    const deliveryRows = await this.db
      .select()
      .from(deliveries)
      .where(eq(deliveries.sessionId, sessionId))
      .orderBy(deliveries.sequenceNumber);

    return {
      session_id: session.id,
      player_id: userId,
      machine_id: session.machineId,
      status: session.status,
      deliveries: deliveryRows.map(mapDeliveryRowToContract),
      started_at: session.startedAt,
      ended_at: session.endedAt ?? undefined,
      total_balls_planned: session.totalBallsPlanned,
      total_balls_delivered: session.totalBallsDelivered,
    };
  }
}
