import { z } from 'zod';

/**
 * Canonical username rules for Bowling Machine player accounts.
 *
 * - 3..32 characters
 * - allowed: letters (a-z A-Z), digits (0-9), underscore (_), hyphen (-)
 * - no whitespace
 * - trimmed before validation
 * - case-insensitive: normalized to lowercase for uniqueness checks
 *
 * Example valid: pratham123, bowler_007, fast-arm
 * Example invalid: "p q", "ab", "a".repeat(33), "hello!"
 */
export const UsernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(32, 'Username must be at most 32 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username may only contain letters, numbers, underscore, or hyphen')
  .transform((s) => s.toLowerCase());

/** Normalises a raw username string to its canonical lowercase form. */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Returns true if the string looks like an email address (contains @). */
export function isEmail(identifier: string): boolean {
  return identifier.includes('@');
}

export type Username = z.infer<typeof UsernameSchema>;
