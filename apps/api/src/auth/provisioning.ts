import { eq } from 'drizzle-orm';
import type { Database } from '@bowling-machine/database';
import { profiles, users } from '@bowling-machine/database';
import type { UserRole } from '@bowling-machine/api-contracts';
import { ApiHttpError } from '../errors/http-errors.js';

export type ProvisionProfileInput = {
  displayName: string;
  battingHand?: 'RIGHT' | 'LEFT' | 'AMBIDEXTROUS' | 'UNSPECIFIED';
  bowlingHand?: 'RIGHT' | 'LEFT' | 'AMBIDEXTROUS' | 'UNSPECIFIED';
  skillLevel?: string;
  practiceGoals?: string[];
};

export type ApplicationUserRecord = {
  userId: string;
  email: string;
  role: UserRole;
  profileId: string | null;
};

async function findUserById(db: Database['db'], userId: string) {
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return rows[0];
}

async function findProfileByUserId(db: Database['db'], userId: string) {
  const rows = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return rows[0];
}

/**
 * Ensures an authenticated Supabase user has corresponding application records.
 *
 * Called on registration (authoritative create) and on authenticated requests (safety net).
 * Uses the Supabase UUID as users.id — never generates a second player identity.
 */
export async function ensureApplicationUser(
  db: Database['db'],
  input: {
    userId: string;
    email: string;
    profile?: ProvisionProfileInput;
  },
): Promise<ApplicationUserRecord> {
  let userRow = await findUserById(db, input.userId);

  if (!userRow) {
    await db.insert(users).values({
      id: input.userId,
      email: input.email,
      role: 'PLAYER',
    });
    userRow = await findUserById(db, input.userId);
  }

  if (!userRow) {
    throw ApiHttpError.internal('Failed to provision application user');
  }

  let profileRow = await findProfileByUserId(db, input.userId);

  if (!profileRow && input.profile) {
    const inserted = await db
      .insert(profiles)
      .values({
        userId: input.userId,
        displayName: input.profile.displayName,
        battingHand: input.profile.battingHand ?? 'UNSPECIFIED',
        bowlingHand: input.profile.bowlingHand ?? 'UNSPECIFIED',
        skillLevel: input.profile.skillLevel,
        practiceGoals: input.profile.practiceGoals,
      })
      .returning();
    profileRow = inserted[0];
  }

  return {
    userId: userRow.id,
    email: userRow.email,
    role: userRow.role,
    profileId: profileRow?.id ?? null,
  };
}

/**
 * Loads role and email for an authenticated Supabase user.
 * Provisioning safety net: creates missing user row if auth exists but DB row was never created.
 */
export async function loadAuthContextForUser(
  db: Database['db'],
  userId: string,
  email: string,
): Promise<ApplicationUserRecord> {
  const userRow = await findUserById(db, userId);

  if (!userRow) {
    return ensureApplicationUser(db, {
      userId,
      email,
      profile: {
        displayName: email.split('@')[0] ?? 'Player',
      },
    });
  }

  const profileRow = await findProfileByUserId(db, userId);

  return {
    userId: userRow.id,
    email: userRow.email,
    role: userRow.role,
    profileId: profileRow?.id ?? null,
  };
}
