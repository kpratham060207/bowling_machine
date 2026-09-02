import { z } from 'zod';
import { HandPreferenceSchema } from './role.js';

/**
 * Player self-registration request — credentials go to Supabase Auth only.
 * The backend uses this payload to create auth + application records server-side.
 */
export const RegisterPlayerRequestSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
  display_name: z
    .string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must be at most 100 characters'),
  batting_hand: HandPreferenceSchema.optional().default('UNSPECIFIED'),
  bowling_hand: HandPreferenceSchema.optional().default('UNSPECIFIED'),
  skill_level: z.string().max(50).optional(),
  practice_goals: z.array(z.string().max(200)).optional(),
});

export type RegisterPlayerRequest = z.infer<typeof RegisterPlayerRequestSchema>;
