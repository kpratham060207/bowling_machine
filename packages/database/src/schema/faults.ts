/**
 * Structured machine faults — persisted fault history, not stack traces.
 */
import { pgTable, uuid, varchar, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { faultSeverityEnum, machineFaultCodeEnum } from './enums';
import { machines } from './machines';
import { machineCommands } from './machine-commands';
import { deliveries } from './deliveries';
import { practiceSessions } from './practice-sessions';

export const faults = pgTable(
  'faults',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    machineId: uuid('machine_id')
      .notNull()
      .references(() => machines.id, { onDelete: 'cascade' }),
    faultCode: machineFaultCodeEnum('fault_code').notNull(),
    severity: faultSeverityEnum('severity').notNull(),
    message: varchar('message', { length: 500 }).notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    recoverable: boolean('recoverable').notNull().default(false),
    resolved: boolean('resolved').notNull().default(false),
    resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'string' }),
    commandId: uuid('command_id').references(() => machineCommands.id, { onDelete: 'set null' }),
    deliveryId: uuid('delivery_id').references(() => deliveries.id, { onDelete: 'set null' }),
    sessionId: uuid('session_id').references(() => practiceSessions.id, { onDelete: 'set null' }),
  },
  (table) => [
    index('faults_machine_time_idx').on(table.machineId, table.occurredAt),
    index('faults_resolved_idx').on(table.resolved),
  ],
);

export type Fault = typeof faults.$inferSelect;
export type NewFault = typeof faults.$inferInsert;
