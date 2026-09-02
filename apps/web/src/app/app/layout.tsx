import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { fetchServerProfile } from '@/lib/api/server';
import { getServerSession } from '@/lib/supabase/server';
import { AppProviders } from './providers';

/** Protected player application layout — redirects unauthenticated users to login. */
export default async function PlayerAppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession();
  if (!session) {
    redirect('/login?next=/app');
  }

  const profile = await fetchServerProfile(session.access_token);

  return (
    <AppProviders>
      <AppShell displayName={profile?.display_name}>{children}</AppShell>
    </AppProviders>
  );
}
