import { eq } from 'drizzle-orm';
import type { Database } from '@bowling-machine/database';
import { profiles, users } from '@bowling-machine/database';
import { normalizeUsername, UsernameSchema, type Player } from '@bowling-machine/api-contracts';
import { ApiHttpError } from '../errors/http-errors.js';

/** Maps database profile row to shared Player contract. */
export function mapProfileRowToPlayer(row: {
  id: string;
  userId: string;
  displayName: string;
  battingHand: 'RIGHT' | 'LEFT' | 'AMBIDEXTROUS' | 'UNSPECIFIED';
  bowlingHand: 'RIGHT' | 'LEFT' | 'AMBIDEXTROUS' | 'UNSPECIFIED';
  username: string | null;
  normalizedUsername: string | null;
  hasPasswordCredential: boolean;
  skillLevel: string | null;
  practiceGoals: string[] | null;
  preferences: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}): Player {
  return {
    id: row.userId,
    display_name: row.displayName,
    batting_hand: row.battingHand,
    bowling_hand: row.bowlingHand,
    username: row.username,
    has_password_credential: row.hasPasswordCredential,
    skill_level: row.skillLevel ?? undefined,
    practice_goals: row.practiceGoals ?? undefined,
    preferences: row.preferences ?? undefined,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export async function getProfileForUser(db: Database['db'], userId: string): Promise<Player> {
  const rows = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  const profile = rows[0];

  if (!profile) {
    throw ApiHttpError.notFound('Player profile not found', { resource: 'profile' });
  }

  return mapProfileRowToPlayer(profile);
}

export type ProfileUpdateInput = {
  displayName?: string;
  username?: string | null;
  battingHand?: 'RIGHT' | 'LEFT' | 'AMBIDEXTROUS' | 'UNSPECIFIED';
  bowlingHand?: 'RIGHT' | 'LEFT' | 'AMBIDEXTROUS' | 'UNSPECIFIED';
  hasPasswordCredential?: boolean;
  skillLevel?: string | null;
  practiceGoals?: string[] | null;
  preferences?: Record<string, unknown> | null;
};

export async function updateProfileForUser(
  db: Database['db'],
  userId: string,
  updates: ProfileUpdateInput,
): Promise<Player> {
  const existingRows = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  const existing = existingRows[0];

  if (!existing) {
    throw ApiHttpError.notFound('Player profile not found', { resource: 'profile' });
  }

  const [updated] = await db
    .update(profiles)
    .set({
      displayName: updates.displayName ?? existing.displayName,
      battingHand: updates.battingHand ?? existing.battingHand,
      bowlingHand: updates.bowlingHand ?? existing.bowlingHand,
      hasPasswordCredential: updates.hasPasswordCredential ?? existing.hasPasswordCredential,
      skillLevel: updates.skillLevel === undefined ? existing.skillLevel : updates.skillLevel,
      practiceGoals:
        updates.practiceGoals === undefined ? existing.practiceGoals : updates.practiceGoals,
      preferences: updates.preferences === undefined ? existing.preferences : updates.preferences,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(profiles.userId, userId))
    .returning();

  if (!updated) {
    throw ApiHttpError.internal('Profile update failed');
  }

  return mapProfileRowToPlayer(updated);
}

/** Sets the username on an existing profile. Throws CONFLICT if already taken. */
export async function setUsernameOnProfile(
  db: Database['db'],
  userId: string,
  rawUsername: string,
): Promise<void> {
  // Parsing through the shared schema keeps the API and persistence layer aligned.
  const parsedUsername = UsernameSchema.parse(rawUsername);
  const normalized = normalizeUsername(parsedUsername);

  const profileRows = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  const profile = profileRows[0];

  if (!profile) {
    throw ApiHttpError.notFound('Player profile not found', { resource: 'profile' });
  }

  const conflicts = await db
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(eq(profiles.normalizedUsername, normalized))
    .limit(1);

  if (conflicts[0] && conflicts[0].userId !== userId) {
    throw ApiHttpError.conflict('Username is already taken');
  }

  try {
    await db
      .update(profiles)
      .set({
        // We persist lowercase so browser and backend views stay consistent everywhere.
        username: normalized,
        normalizedUsername: normalized,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(profiles.userId, userId));
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      throw ApiHttpError.conflict('Username is already taken');
    }
    throw error;
  }
}

/** Returns the email address for a given normalized username, or null. */
export async function lookupEmailByUsername(
  db: Database['db'],
  normalizedUsername: string,
): Promise<string | null> {
  const rows = await db
    .select({ email: users.email })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .where(eq(profiles.normalizedUsername, normalizedUsername))
    .limit(1);

  return rows[0]?.email ?? null;
}
