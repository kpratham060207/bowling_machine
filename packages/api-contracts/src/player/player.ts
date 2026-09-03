import { z } from 'zod';
import { EntityIdSchema, TimestampSchema } from '../common/primitives.js';
import { HandPreferenceSchema } from './role.js';

/**
 * Player preferences — UI defaults and non-auth configuration.
 * Kept separate from auth-provider (Supabase) internals.
 */
export const PlayerPreferencesSchema = z
  .object({
    default_speed_kmh: z.number().positive().optional(),
    favorite_ball_types: z.array(z.string()).optional(),
    locale: z.string().optional(),
  })
  .passthrough()
  .describe('Extensible preference bag; unknown keys allowed for forward compatibility');

/**
 * Application-level Player profile contract.
 *
 * Does NOT include passwords, tokens, or Supabase credentials.
 * Auth identity is linked via `id` (matches Supabase user UUID in persistence layer).
 *
 * Note: Phase 0 database design used a single `handedness` column. Phase 1C MUST
 * align persistence with `batting_hand` and `bowling_hand` — no `handedness` alias.
 */
export const PlayerSchema = z.object({
  id: EntityIdSchema.describe('Application player ID (matches auth user UUID)'),
  display_name: z
    .string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must be at most 100 characters'),
  batting_hand: HandPreferenceSchema.describe('Preferred batting hand'),
  bowling_hand: HandPreferenceSchema.describe('Preferred bowling hand (for context display)'),
  /**
   * Username is nullable during rollout so existing players can claim one later
   * without breaking older records.
   */
  username: z.string().nullable().optional().describe('Player username; null until claimed'),
  /**
   * Lets clients decide whether to show password-based login and reset flows
   * without exposing any credential material.
   */
  has_password_credential: z
    .boolean()
    .optional()
    .describe('True when an app password has been set'),
  skill_level: z
    .string()
    .max(50)
    .optional()
    .describe('Self-assessed skill level — unconstrained until taxonomy defined'),
  practice_goals: z
    .array(z.string().max(200))
    .optional()
    .describe('Player-defined practice goals (free text)'),
  preferences: PlayerPreferencesSchema.optional(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
});

export type Player = z.infer<typeof PlayerSchema>;
export type PlayerPreferences = z.infer<typeof PlayerPreferencesSchema>;
