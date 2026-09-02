import { z } from 'zod';

/**
 * Application roles — ONLY PLAYER and ADMIN per project architecture.
 * Do not extend without an ADR.
 */
export const UserRoleSchema = z.enum(['PLAYER', 'ADMIN']);

export type UserRole = z.infer<typeof UserRoleSchema>;

/** Batting or bowling hand preference. */
export const HandPreferenceSchema = z.enum(['RIGHT', 'LEFT', 'AMBIDEXTROUS', 'UNSPECIFIED']);

export type HandPreference = z.infer<typeof HandPreferenceSchema>;
