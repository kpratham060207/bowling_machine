/**
 * Machine control lock — MVP exclusive control lease (UD-06 first-come-first-served).
 *
 * One active lock row per machine (machine_id is PK). Only one player may hold
 * control at a time. Abandoned locks expire via expires_at and can be reclaimed.
 *
 * This table was added in Phase 1E because no existing table modeled runtime
 * machine control ownership separate from practice_sessions.
 */
import { pgTable, uuid, timestamp, index } from 'drizzle-orm/pg-core';
import { machines } from './machines';
import { users } from './users';

export const machineControlLocks = pgTable(
  'machine_control_locks',
  {
    /** One lock record per machine — upserted on acquire/release. */
    machineId: uuid('machine_id')
      .primaryKey()
      .references(() => machines.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Application-scoped connection id returned to the controlling player. */
    connectionId: uuid('connection_id').notNull(),
    acquiredAt: timestamp('acquired_at', { withTimezone: true, mode: 'string' }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
    /** Null while lock is active; set when player releases or lock is superseded. */
    releasedAt: timestamp('released_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index('machine_control_locks_user_id_idx').on(table.userId),
    index('machine_control_locks_expires_at_idx').on(table.expiresAt),
  ],
);

export type MachineControlLock = typeof machineControlLocks.$inferSelect;
export type NewMachineControlLock = typeof machineControlLocks.$inferInsert;
