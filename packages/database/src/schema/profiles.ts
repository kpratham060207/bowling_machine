/**
 * Player profile — application-level data separate from Supabase Auth.
 * One profile per user; uses batting_hand/bowling_hand (not legacy handedness).
 */
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  index,
  boolean,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
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
    /**
     * Public, globally unique username claim for app login and identity.
     * Nullable for existing accounts so rollout can happen gradually.
     */
    username: varchar('username', { length: 32 }),
    /**
     * Lowercase canonical username used for case-insensitive uniqueness checks.
     * Stored separately so lookup queries stay simple and predictable.
     */
    normalizedUsername: varchar('normalized_username', { length: 32 }),
    /**
     * Tracks whether the linked auth identity currently has an app password credential.
     * This stays separate from Supabase internals so the UI can branch safely.
     */
    hasPasswordCredential: boolean('has_password_credential').notNull().default(false),
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
  (table) => [
    index('profiles_user_id_idx').on(table.userId),
    // Partial unique index: only enforce uniqueness for non-null usernames so
    // existing accounts without a username can coexist safely during rollout.
    uniqueIndex('profiles_normalized_username_unique')
      .on(table.normalizedUsername)
      .where(sql`${table.normalizedUsername} IS NOT NULL`),
  ],
);

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
