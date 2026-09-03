import { redirect } from 'next/navigation';
import { ForgotPasswordForm } from '@/components/auth-forms';
import { getServerSession } from '@/lib/supabase/server';

/** Forgot-password page — authenticated users can go straight back into the app. */
export default async function ForgotPasswordPage() {
  const session = await getServerSession();

  if (session) {
    redirect('/app');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="app-container max-w-md space-y-6 py-10">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Reset password</h1>
          <p className="text-sm text-slate-600">
            Enter your email and we&apos;ll send reset instructions if an account exists.
          </p>
        </div>

        <div className="card">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
