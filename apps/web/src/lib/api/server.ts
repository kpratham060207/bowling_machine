import type { Player } from '@bowling-machine/api-contracts';
import { getApiBaseUrl } from '@/lib/supabase/client';

/** Server-side profile fetch for authenticated layouts — uses session access token. */
export async function fetchServerProfile(accessToken: string): Promise<Player | null> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  const body = (await response.json()) as { data: Player };
  return body.data;
}
