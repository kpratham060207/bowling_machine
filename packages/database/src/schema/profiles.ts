/**
 * Player profile — application-level data separate from Supabase Auth.
 * One profile per user; uses batting_hand/bowling_hand (not legacy handedness).
 */
import { pgTable, uuid, varchar, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { handPreferenceEnum } from './enums';
import { users } from './users';

export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** FK to users.id (Supabase auth UUID). */
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    displayName: varchar('display_name', { length: 100 }).notNull(),
    battingHand: handPreferenceEnum('batting_hand').notNull().default('UNSPECIFIED'),
    bowlingHand: handPreferenceEnum('bowling_hand').notNull().default('UNSPECIFIED'),
    skillLevel: varchar('skill_level', { length: 50 }),
    /** Free-text practice goals — array of strings. */
    practiceGoals: jsonb('practice_goals').$type<string[]>(),
    /** UI defaults and extensible preferences bag. */
    preferences: jsonb('preferences').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('profiles_user_id_idx').on(table.userId)],
);

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
