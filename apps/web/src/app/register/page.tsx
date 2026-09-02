import { redirect } from 'next/navigation';
import { RegisterForm } from '@/components/auth-forms';
import { getServerSession } from '@/lib/supabase/server';

/** Registration page — redirects authenticated users to profile. */
export default async function RegisterPage() {
  const session = await getServerSession();
  if (session) {
    redirect('/profile');
  }

  return (
    <main>
      <h1>Create account</h1>
      <RegisterForm />
    </main>
  );
}
