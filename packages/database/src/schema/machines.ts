/**
 * Registered bowling machines — static identity and admin registry status.
 * Runtime machine state lives in telemetry, not here.
 */
import { pgTable, uuid, varchar, timestamp, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { machineRegistryStatusEnum, machineKindEnum } from './enums';
import { firmwareVersions } from './firmware-versions';

export const machines = pgTable(
  'machines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Human-readable label shown in UI. */
    name: varchar('name', { length: 100 }).notNull(),
    /** Physical or logical machine identifier — unique across registry. */
    serialNumber: varchar('serial_number', { length: 50 }).notNull(),
    registryStatus: machineRegistryStatusEnum('registry_status').notNull().default('ACTIVE'),
    kind: machineKindEnum('kind').notNull().default('HARDWARE'),
    /** Protocol version this machine speaks — matches PROTOCOL_VERSION contract. */
    protocolVersion: varchar('protocol_version', { length: 10 }).notNull().default('1.0'),
    /** Optional FK to firmware_versions; denormalized string kept for quick lookup. */
    firmwareVersionId: uuid('firmware_version_id').references(() => firmwareVersions.id, {
      onDelete: 'set null',
    }),
    lastKnownFirmwareVersion: varchar('last_known_firmware_version', { length: 50 }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true, mode: 'string' }),
    /** Non-sensitive machine configuration — not GPIO/hardware maps. */
    config: jsonb('config').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    uniqueIndex('machines_serial_number_unique').on(table.serialNumber),
    index('machines_registry_status_idx').on(table.registryStatus),
  ],
);

export type Machine = typeof machines.$inferSelect;
export type NewMachine = typeof machines.$inferInsert;
