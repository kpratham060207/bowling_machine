import { redirect } from 'next/navigation';
import { RegisterForm } from '@/components/auth-forms';
import { sanitizeAuthRedirectPath } from '@/lib/auth/safe-redirect';
import { getServerSession } from '@/lib/supabase/server';

type RegisterPageProps = {
  searchParams: Promise<{ next?: string }>;
};

/** Registration page — redirects authenticated users to the player app. */
export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const session = await getServerSession();
  const params = await searchParams;
  const nextPath = sanitizeAuthRedirectPath(params.next);

  if (session) {
    redirect(nextPath);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="app-container max-w-md space-y-6 py-10">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Create account</h1>
          <p className="text-sm text-slate-600">Join to start practice sessions.</p>
        </div>
        <div className="card">
          <RegisterForm nextPath={nextPath} />
        </div>
      </div>
    </div>
  );
}
