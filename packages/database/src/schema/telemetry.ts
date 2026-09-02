/**
 * Persisted telemetry samples — NOT every live WebSocket packet.
 * Gateway selects meaningful events/snapshots for storage; high-frequency
 * streaming remains transient.
 */
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  numeric,
  jsonb,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { machines } from './machines';
import { practiceSessions } from './practice-sessions';
import { deliveries } from './deliveries';
import { machineCommands } from './machine-commands';

/** IMU orientation — unit UNRESOLVED per api-contracts (UD-12a). */
export type ImuJson = { pitch: number; roll: number; yaw: number };

export const telemetrySamples = pgTable(
  'telemetry_samples',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    machineId: uuid('machine_id')
      .notNull()
      .references(() => machines.id, { onDelete: 'cascade' }),
    recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    /** Runtime machine state at sample time — matches MachineStateSchema. */
    state: varchar('state', { length: 30 }).notNull(),
    wheel1CurrentRpm: numeric('wheel1_current_rpm', { precision: 10, scale: 2 }),
    wheel2CurrentRpm: numeric('wheel2_current_rpm', { precision: 10, scale: 2 }),
    wheel1TargetRpm: numeric('wheel1_target_rpm', { precision: 10, scale: 2 }),
    wheel2TargetRpm: numeric('wheel2_target_rpm', { precision: 10, scale: 2 }),
    /** Actuator positions — machine-local units UNRESOLVED (UD-02). */
    actuatorCurrentPositions: jsonb('actuator_current_positions').$type<(number | null)[]>(),
    actuatorTargetPositions: jsonb('actuator_target_positions').$type<(number | null)[]>(),
    imu: jsonb('imu').$type<ImuJson>(),
    feederStatus: varchar('feeder_status', { length: 20 }),
    homingStatus: varchar('homing_status', { length: 20 }),
    emergencyStopActive: boolean('emergency_stop_active').notNull().default(false),
    activeFaultCode: varchar('active_fault_code', { length: 50 }),
    activeCommandId: uuid('active_command_id').references(() => machineCommands.id, {
      onDelete: 'set null',
    }),
    sessionId: uuid('session_id').references(() => practiceSessions.id, { onDelete: 'set null' }),
    deliveryId: uuid('delivery_id').references(() => deliveries.id, { onDelete: 'set null' }),
  },
  (table) => [
    index('telemetry_samples_machine_time_idx').on(table.machineId, table.recordedAt),
    index('telemetry_samples_session_id_idx').on(table.sessionId),
  ],
);

export type TelemetrySample = typeof telemetrySamples.$inferSelect;
export type NewTelemetrySample = typeof telemetrySamples.$inferInsert;
