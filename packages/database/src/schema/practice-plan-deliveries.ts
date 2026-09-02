/**
 * Ordered delivery definitions within a practice plan — normalized, not a JSON blob.
 */
import { pgTable, uuid, integer, numeric, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { ballTypeEnum } from './enums';
import { practicePlans } from './practice-plans';

export const practicePlanDeliveries = pgTable(
  'practice_plan_deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    planId: uuid('plan_id')
      .notNull()
      .references(() => practicePlans.id, { onDelete: 'cascade' }),
    sequenceNumber: integer('sequence_number').notNull(),
    targetX: numeric('target_x', { precision: 5, scale: 4 }).notNull(),
    targetY: numeric('target_y', { precision: 5, scale: 4 }).notNull(),
    desiredSpeedKmh: numeric('desired_speed_kmh', { precision: 6, scale: 2 }).notNull(),
    ballType: ballTypeEnum('ball_type').notNull(),
    numberOfBalls: integer('number_of_balls').notNull(),
    firstBallDelayMs: integer('first_ball_delay_ms').notNull().default(0),
    intervalMs: integer('interval_ms').notNull().default(0),
  },
  (table) => [
    uniqueIndex('practice_plan_deliveries_plan_sequence_unique').on(
      table.planId,
      table.sequenceNumber,
    ),
    index('practice_plan_deliveries_plan_id_idx').on(table.planId),
  ],
);

export type PracticePlanDelivery = typeof practicePlanDeliveries.$inferSelect;
export type NewPracticePlanDelivery = typeof practicePlanDeliveries.$inferInsert;
