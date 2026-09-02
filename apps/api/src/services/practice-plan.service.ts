import { randomUUID } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import type {
  CreatePracticePlanRequest,
  PracticePlan as PracticePlanContract,
  UpdatePracticePlanRequest,
} from '@bowling-machine/api-contracts';
import type { Database } from '@bowling-machine/database';
import { practicePlanDeliveries, practicePlans } from '@bowling-machine/database';
import { ApiHttpError } from '../errors/http-errors.js';
import { nowIso } from '../lib/machine-crypto.js';
import { assertPlanOwnership } from './ownership.service.js';
import { mapPlanDeliveryRowToContract } from './practice-plan.mapper.js';

/**
 * Practice plan persistence — reusable high-level delivery templates owned by players.
 * Plans store requested parameters only; machine calculation happens at session execution.
 */
export class PracticePlanService {
  constructor(private readonly db: Database['db']) {}

  async createPlan(userId: string, body: CreatePracticePlanRequest): Promise<PracticePlanContract> {
    const planId = randomUUID();
    const timestamp = nowIso();

    await this.db.transaction(async (tx) => {
      await tx.insert(practicePlans).values({
        id: planId,
        userId,
        name: body.name,
        description: body.description ?? null,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      await this.insertDeliveries(tx, planId, body.deliveries);
    });

    return this.getPlanForUser(planId, userId);
  }

  async listPlans(userId: string): Promise<PracticePlanContract[]> {
    const rows = await this.db
      .select()
      .from(practicePlans)
      .where(eq(practicePlans.userId, userId))
      .orderBy(desc(practicePlans.updatedAt));

    return Promise.all(rows.map((row) => this.buildPlanContract(row.id, userId)));
  }

  async getPlanForUser(planId: string, userId: string): Promise<PracticePlanContract> {
    await assertPlanOwnership(this.db, planId, userId);
    return this.buildPlanContract(planId, userId);
  }

  async updatePlan(
    userId: string,
    planId: string,
    body: UpdatePracticePlanRequest,
  ): Promise<PracticePlanContract> {
    await assertPlanOwnership(this.db, planId, userId);

    await this.db.transaction(async (tx) => {
      await tx
        .update(practicePlans)
        .set({
          name: body.name,
          description: body.description ?? null,
          updatedAt: nowIso(),
        })
        .where(eq(practicePlans.id, planId));

      await tx.delete(practicePlanDeliveries).where(eq(practicePlanDeliveries.planId, planId));
      await this.insertDeliveries(tx, planId, body.deliveries);
    });

    return this.getPlanForUser(planId, userId);
  }

  /** Deletes a plan only — historical sessions created from the plan are unchanged. */
  async deletePlan(userId: string, planId: string): Promise<void> {
    await assertPlanOwnership(this.db, planId, userId);
    await this.db.delete(practicePlans).where(eq(practicePlans.id, planId));
  }

  private async buildPlanContract(planId: string, userId: string): Promise<PracticePlanContract> {
    const planRows = await this.db
      .select()
      .from(practicePlans)
      .where(eq(practicePlans.id, planId))
      .limit(1);

    const plan = planRows[0];
    if (!plan || plan.userId !== userId) {
      throw ApiHttpError.notFound('Practice plan not found');
    }

    const deliveryRows = await this.db
      .select()
      .from(practicePlanDeliveries)
      .where(eq(practicePlanDeliveries.planId, planId))
      .orderBy(practicePlanDeliveries.sequenceNumber);

    return {
      plan_id: plan.id,
      player_id: plan.userId,
      name: plan.name,
      description: plan.description,
      deliveries: deliveryRows.map(mapPlanDeliveryRowToContract),
      created_at: plan.createdAt,
      updated_at: plan.updatedAt,
    };
  }

  private async insertDeliveries(
    tx: Parameters<Parameters<Database['db']['transaction']>[0]>[0],
    planId: string,
    deliveries: CreatePracticePlanRequest['deliveries'],
  ): Promise<void> {
    for (const [index, delivery] of deliveries.entries()) {
      await tx.insert(practicePlanDeliveries).values({
        planId,
        sequenceNumber: index + 1,
        targetX: String(delivery.target_x),
        targetY: String(delivery.target_y),
        desiredSpeedKmh: String(delivery.desired_speed_kmh),
        ballType: delivery.ball_type,
        numberOfBalls: delivery.number_of_balls,
        firstBallDelayMs: delivery.first_ball_delay_ms,
        intervalMs: delivery.interval_ms,
      });
    }
  }
}
