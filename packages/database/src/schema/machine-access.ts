/**
 * Player ↔ machine access grant — MVP machine authorization without organizations.
 * One player may access many machines; many players may use a machine over time.
 */
import { pgTable, uuid, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { machines } from './machines';

export const machineAccess = pgTable(
  'machine_access',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    machineId: uuid('machine_id')
      .notNull()
      .references(() => machines.id, { onDelete: 'cascade' }),
    grantedAt: timestamp('granted_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('machine_access_user_machine_unique').on(table.userId, table.machineId),
    index('machine_access_user_id_idx').on(table.userId),
    index('machine_access_machine_id_idx').on(table.machineId),
  ],
);

export type MachineAccess = typeof machineAccess.$inferSelect;
export type NewMachineAccess = typeof machineAccess.$inferInsert;
