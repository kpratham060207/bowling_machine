/**
 * Machine-level calculated parameters snapshot.
 * Stored as JSONB — actuator units remain UNRESOLVED (UD-02) per api-contracts.
 */
export type CalculatedParametersJson = {
  wheel1_target_rpm: number | null;
  wheel2_target_rpm: number | null;
  actuator1_target_position: number | null;
  actuator2_target_position: number | null;
  actuator3_target_position: number | null;
  actuator4_target_position: number | null;
  feeder_delay_ms: number | null;
  ball_count: number;
  first_ball_delay_ms: number;
  interval_ms: number;
};

export type MeasuredValuesJson = {
  wheel1_actual_rpm?: number | null;
  wheel2_actual_rpm?: number | null;
  landed_at?: string;
};

export type DeliveryErrorJson = {
  fault_code: string;
  severity: string;
  message: string;
  recoverable: boolean;
};

/**
 * Delivery record — preserves REQUESTED vs CALCULATED vs MEASURED separation.
 */
import {
  pgTable,
  uuid,
  integer,
  numeric,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { ballTypeEnum, deliveryStatusEnum } from './enums';
import { practiceSessions } from './practice-sessions';
import { machineCommands } from './machine-commands';

export const deliveries = pgTable(
  'deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => practiceSessions.id, { onDelete: 'cascade' }),
    sequenceNumber: integer('sequence_number').notNull(),
    uiX: numeric('ui_x', { precision: 5, scale: 4 }),
    uiY: numeric('ui_y', { precision: 5, scale: 4 }),
    targetX: numeric('target_x', { precision: 5, scale: 4 }).notNull(),
    targetY: numeric('target_y', { precision: 5, scale: 4 }).notNull(),
    desiredSpeedKmh: numeric('desired_speed_kmh', { precision: 6, scale: 2 }).notNull(),
    ballType: ballTypeEnum('ball_type').notNull(),
    numberOfBalls: integer('number_of_balls').notNull(),
    firstBallDelayMs: integer('first_ball_delay_ms').notNull().default(0),
    intervalMs: integer('interval_ms').notNull().default(0),
    calculatedParameters: jsonb('calculated_parameters').$type<CalculatedParametersJson>(),
    status: deliveryStatusEnum('status').notNull().default('PENDING'),
    machineCommandId: uuid('machine_command_id').references(() => machineCommands.id, {
      onDelete: 'set null',
    }),
    executedAt: timestamp('executed_at', { withTimezone: true, mode: 'string' }),
    measured: jsonb('measured').$type<MeasuredValuesJson>(),
    error: jsonb('error').$type<DeliveryErrorJson>(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('deliveries_session_sequence_unique').on(table.sessionId, table.sequenceNumber),
    index('deliveries_session_id_idx').on(table.sessionId),
    index('deliveries_status_idx').on(table.status),
    index('deliveries_machine_command_id_idx').on(table.machineCommandId),
  ],
);

export type Delivery = typeof deliveries.$inferSelect;
export type NewDelivery = typeof deliveries.$inferInsert;
