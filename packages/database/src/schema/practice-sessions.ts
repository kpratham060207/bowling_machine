/**
 * Practice session — groups deliveries for one player on one machine.
 * Session status is NOT machine runtime state (see telemetry for that).
 */
import { pgTable, uuid, timestamp, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { sessionStatusEnum } from './enums';
import { users } from './users';
import { machines } from './machines';

export const practiceSessions = pgTable(
  'practice_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    machineId: uuid('machine_id')
      .notNull()
      .references(() => machines.id, { onDelete: 'restrict' }),
    status: sessionStatusEnum('status').notNull().default('ACTIVE'),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true, mode: 'string' }),
    totalBallsPlanned: integer('total_balls_planned').notNull().default(0),
    totalBallsDelivered: integer('total_balls_delivered').notNull().default(0),
    /** Optional session-level settings — not delivery parameters. */
    config: jsonb('config').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('practice_sessions_user_started_idx').on(table.userId, table.startedAt),
    index('practice_sessions_machine_id_idx').on(table.machineId),
    index('practice_sessions_status_idx').on(table.status),
  ],
);

export type PracticeSession = typeof practiceSessions.$inferSelect;
export type NewPracticeSession = typeof practiceSessions.$inferInsert;
