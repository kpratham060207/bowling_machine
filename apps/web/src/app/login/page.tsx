import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/auth-forms';
import { getServerSession } from '@/lib/supabase/server';

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

/** Login page — redirects authenticated users to the player app. */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getServerSession();
  const params = await searchParams;

  if (session) {
    redirect(params.next ?? '/app');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="app-container max-w-md space-y-6 py-10">
        <div className="space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-pitch-700">
            Bowling Machine
          </p>
          <h1 className="text-2xl font-bold">Sign in</h1>
          <p className="text-sm text-slate-600">Access your practice sessions and machines.</p>
        </div>

        <div className="card">
          <LoginForm nextPath={params.next ?? '/app'} />
        </div>

        <p className="text-center text-sm text-slate-600">
          No account?{' '}
          <Link href="/register" className="font-medium text-pitch-700 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
