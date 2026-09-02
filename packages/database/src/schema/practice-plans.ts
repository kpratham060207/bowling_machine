/**
 * Saved practice plans — reusable delivery sequences owned by a player.
 */
import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const practicePlans = pgTable(
  'practice_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('practice_plans_user_id_idx').on(table.userId)],
);

export type PracticePlan = typeof practicePlans.$inferSelect;
export type NewPracticePlan = typeof practicePlans.$inferInsert;
