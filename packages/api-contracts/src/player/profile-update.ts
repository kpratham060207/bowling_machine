import { z } from 'zod';
import { HandPreferenceSchema } from './role.js';
import { PlayerPreferencesSchema } from './player.js';

/**
 * Profile update payload — ownership comes from the authenticated session only.
 * Client-supplied user_id / id fields are rejected by the API layer.
 */
export const UpdatePlayerProfileRequestSchema = z
  .object({
    display_name: z.string().min(1).max(100).optional(),
    batting_hand: HandPreferenceSchema.optional(),
    bowling_hand: HandPreferenceSchema.optional(),
    skill_level: z.string().max(50).nullable().optional(),
    practice_goals: z.array(z.string().max(200)).nullable().optional(),
    preferences: PlayerPreferencesSchema.nullable().optional(),
    /** Must never be accepted — included so the API can explicitly reject elevation attempts. */
    role: z.never().optional(),
    user_id: z.never().optional(),
    id: z.never().optional(),
  })
  .strict();

export type UpdatePlayerProfileRequest = z.infer<typeof UpdatePlayerProfileRequestSchema>;
