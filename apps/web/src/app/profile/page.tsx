import { redirect } from 'next/navigation';
import type { Player } from '@bowling-machine/api-contracts';
import { getServerSession } from '@/lib/supabase/server';
import { getApiBaseUrl } from '@/lib/supabase/client';

async function fetchProfile(accessToken: string): Promise<Player | null> {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/api/v1/profile`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  const body = (await response.json()) as { data: Player };
  return body.data;
}

/** Profile page — loads player data from backend using session access token. */
export default async function ProfilePage() {
  const session = await getServerSession();
  if (!session) {
    redirect('/login');
  }

  const profile = await fetchProfile(session.access_token);

  if (!profile) {
    return (
      <main>
        <h1>Profile</h1>
        <p>Unable to load profile. Your account may still be provisioning — try again shortly.</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Your profile</h1>
      <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem' }}>
        <dt>Display name</dt>
        <dd>{profile.display_name}</dd>
        <dt>Batting hand</dt>
        <dd>{profile.batting_hand}</dd>
        <dt>Bowling hand</dt>
        <dd>{profile.bowling_hand}</dd>
        <dt>Skill level</dt>
        <dd>{profile.skill_level ?? '—'}</dd>
        <dt>Player ID</dt>
        <dd style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{profile.id}</dd>
      </dl>
    </main>
  );
}
