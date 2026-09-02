/**
 * Machine command history — full audit trail for idempotency and traceability.
 *
 * Payload storage decision (Phase 1C):
 * - Queryable metadata in columns (type, status, timestamps, FKs)
 * - Full domain command snapshot in payload JSONB for protocol fidelity
 * - Do not normalize nested protocol fields into separate tables for MVP
 */
import { pgTable, uuid, varchar, timestamp, jsonb, boolean, index } from 'drizzle-orm/pg-core';
import { machineCommandTypeEnum, machineCommandStatusEnum, machineFaultCodeEnum } from './enums';
import { machines } from './machines';
import { practiceSessions } from './practice-sessions';

export const machineCommands = pgTable(
  'machine_commands',
  {
    /** Matches CommandId in api-contracts — supports idempotency. */
    id: uuid('id').primaryKey(),
    machineId: uuid('machine_id')
      .notNull()
      .references(() => machines.id, { onDelete: 'restrict' }),
    commandType: machineCommandTypeEnum('command_type').notNull(),
    protocolVersion: varchar('protocol_version', { length: 10 }).notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true, mode: 'string' }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }),
    /** Full MachineCommand domain object snapshot at dispatch time. */
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    status: machineCommandStatusEnum('status').notNull().default('PENDING'),
    /** Acknowledgement fields — populated when machine responds. */
    ackAccepted: boolean('ack_accepted'),
    ackErrorCode: machineFaultCodeEnum('ack_error_code'),
    ackMessage: varchar('ack_message', { length: 500 }),
    ackedAt: timestamp('acked_at', { withTimezone: true, mode: 'string' }),
    sessionId: uuid('session_id').references(() => practiceSessions.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('machine_commands_machine_id_idx').on(table.machineId),
    index('machine_commands_status_idx').on(table.status),
    index('machine_commands_session_id_idx').on(table.sessionId),
    index('machine_commands_issued_at_idx').on(table.issuedAt),
  ],
);

export type MachineCommand = typeof machineCommands.$inferSelect;
export type NewMachineCommand = typeof machineCommands.$inferInsert;
