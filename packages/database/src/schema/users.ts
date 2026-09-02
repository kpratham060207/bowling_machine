/**
 * Application user identity — mirrors Supabase Auth user ID.
 * Passwords are NEVER stored here; auth is Supabase-only.
 */
import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { userRoleEnum } from './enums';

export const users = pgTable(
  'users',
  {
    /** Matches Supabase Auth user UUID — canonical application player identity. */
    id: uuid('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    role: userRoleEnum('role').notNull().default('PLAYER'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('users_email_idx').on(table.email)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
