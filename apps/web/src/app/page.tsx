import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/supabase/server';

/** Root route — authenticated players go to the app; others see login. */
export default async function HomePage() {
  const session = await getServerSession();
  if (session) {
    redirect('/app');
  }
  redirect('/login');
}
