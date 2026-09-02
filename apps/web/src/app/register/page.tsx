import { redirect } from 'next/navigation';
import { RegisterForm } from '@/components/auth-forms';
import { getServerSession } from '@/lib/supabase/server';

/** Registration page — redirects authenticated users to the player app. */
export default async function RegisterPage() {
  const session = await getServerSession();
  if (session) {
    redirect('/app');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="app-container max-w-md space-y-6 py-10">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Create account</h1>
          <p className="text-sm text-slate-600">Join to start practice sessions.</p>
        </div>
        <div className="card">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
