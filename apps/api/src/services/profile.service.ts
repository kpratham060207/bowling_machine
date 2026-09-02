import { eq } from 'drizzle-orm';
import type { Database } from '@bowling-machine/database';
import { profiles } from '@bowling-machine/database';
import type { Player } from '@bowling-machine/api-contracts';
import { ApiHttpError } from '../errors/http-errors.js';

/** Maps database profile row to shared Player contract. */
export function mapProfileRowToPlayer(row: {
  id: string;
  userId: string;
  displayName: string;
  battingHand: 'RIGHT' | 'LEFT' | 'AMBIDEXTROUS' | 'UNSPECIFIED';
  bowlingHand: 'RIGHT' | 'LEFT' | 'AMBIDEXTROUS' | 'UNSPECIFIED';
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
  battingHand?: 'RIGHT' | 'LEFT' | 'AMBIDEXTROUS' | 'UNSPECIFIED';
  bowlingHand?: 'RIGHT' | 'LEFT' | 'AMBIDEXTROUS' | 'UNSPECIFIED';
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
