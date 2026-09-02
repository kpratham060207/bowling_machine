import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/auth-forms';
import { getServerSession } from '@/lib/supabase/server';

/** Login page — redirects authenticated users to profile. */
export default async function LoginPage() {
  const session = await getServerSession();
  if (session) {
    redirect('/profile');
  }

  return (
    <main>
      <h1>Sign in</h1>
      <LoginForm />
    </main>
  );
}
