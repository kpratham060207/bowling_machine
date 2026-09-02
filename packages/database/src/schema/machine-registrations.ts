/**
 * Machine registration record — links a machine to its QR discovery token.
 *
 * PROVISIONAL (Phase 1C review):
 * - `qr_code_token` — public identifier encoded in QR URL only (never secrets).
 * - `connection_secret_hash` — hashed peer credential for intended machine WebSocket
 *   auth; semantics NOT finalized (see UD-21). Plaintext never stored.
 *
 * This table is registration infrastructure, not the final machine auth architecture.
 */
import { pgTable, uuid, varchar, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { machines } from './machines';

export const machineRegistrations = pgTable(
  'machine_registrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    machineId: uuid('machine_id')
      .notNull()
      .references(() => machines.id, { onDelete: 'cascade' }),
    qrCodeToken: varchar('qr_code_token', { length: 128 }).notNull(),
    /** Bcrypt or similar hash of machine WebSocket secret. */
    connectionSecretHash: varchar('connection_secret_hash', { length: 255 }).notNull(),
    localIp: varchar('local_ip', { length: 45 }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('machine_registrations_qr_token_unique').on(table.qrCodeToken),
    index('machine_registrations_machine_id_idx').on(table.machineId),
  ],
);

export type MachineRegistration = typeof machineRegistrations.$inferSelect;
export type NewMachineRegistration = typeof machineRegistrations.$inferInsert;
