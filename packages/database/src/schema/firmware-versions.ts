/**
 * Firmware version registry — metadata only; OTA deployment is out of scope for MVP.
 */
import { pgTable, uuid, varchar, timestamp, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';
import { firmwareReleaseStatusEnum } from './enums';

export const firmwareVersions = pgTable(
  'firmware_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Semantic version string e.g. "0.1.0". */
    version: varchar('version', { length: 50 }).notNull(),
    releaseStatus: firmwareReleaseStatusEnum('release_status').notNull().default('DRAFT'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex('firmware_versions_version_unique').on(table.version)],
);

export type FirmwareVersion = typeof firmwareVersions.$inferSelect;
export type NewFirmwareVersion = typeof firmwareVersions.$inferInsert;
