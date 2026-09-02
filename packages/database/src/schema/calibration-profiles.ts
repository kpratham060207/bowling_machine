/**
 * Versioned calibration profiles per machine.
 * Physical calibration data is JSONB — contents populated later via calibration workflow.
 * Do NOT invent physics model values in seed/migrations.
 */
import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { calibrationProfileStatusEnum } from './enums';
import { machines } from './machines';
import { users } from './users';

export const calibrationProfiles = pgTable(
  'calibration_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    machineId: uuid('machine_id')
      .notNull()
      .references(() => machines.id, { onDelete: 'cascade' }),
    /** Calibration type key e.g. speed_rpm, position_trajectory. */
    calibrationType: varchar('calibration_type', { length: 50 }).notNull(),
    version: integer('version').notNull(),
    status: calibrationProfileStatusEnum('status').notNull().default('DRAFT'),
    /** Flexible calibration map — structure defined by calibration system, not DB. */
    data: jsonb('data').$type<Record<string, unknown>>().notNull(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    notes: varchar('notes', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('calibration_profiles_machine_type_version_unique').on(
      table.machineId,
      table.calibrationType,
      table.version,
    ),
    index('calibration_profiles_machine_status_idx').on(table.machineId, table.status),
  ],
);

export type CalibrationProfile = typeof calibrationProfiles.$inferSelect;
export type NewCalibrationProfile = typeof calibrationProfiles.$inferInsert;
