import { z } from 'zod';
import { HandPreferenceSchema } from './role.js';
import { PlayerPreferencesSchema } from './player.js';
import { UsernameSchema } from './username.js';

/**
 * Profile update payload — ownership comes from the authenticated session only.
 * Client-supplied user_id / id fields are rejected by the API layer.
 */
export const UpdatePlayerProfileRequestSchema = z
  .object({
    display_name: z.string().min(1).max(100).optional(),
    /**
     * Username updates are allowed here; the API normalises and applies
     * uniqueness rules server-side before persisting.
     */
    username: UsernameSchema.optional().describe('Claim or change username'),
    batting_hand: HandPreferenceSchema.optional(),
    bowling_hand: HandPreferenceSchema.optional(),
    /**
     * The actual password lives in Supabase Auth. The application database only
     * keeps a boolean flag so the UI can explain whether password login is set up.
     */
    has_password_credential: z.boolean().optional(),
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
