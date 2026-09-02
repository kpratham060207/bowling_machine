/**
 * QR code and connection credentials for machine discovery.
 * connection_secret stores a hashed value — never plaintext secrets in DB.
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
