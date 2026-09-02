'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type SubmitEvent } from 'react';
import { GoogleIcon } from '@/components/google-icon';
import { signInWithGoogle } from '@/lib/auth/oauth';
import { createClient, getApiBaseUrl } from '@/lib/supabase/client';

async function signInWithEmail(email: string, password: string): Promise<string | null> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? 'Invalid email or password' : null;
}

type LoginFormProps = {
  nextPath?: string;
  initialError?: string | null;
};

/**
 * Login form — email/password plus Google OAuth.
 * Both paths produce the same Supabase cookie session consumed by SSR and the API.
 */
export function LoginForm({ nextPath = '/app', initialError = null }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(initialError);
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const authBusy = emailLoading || googleLoading;

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    void (async () => {
      setEmailLoading(true);
      setError(null);

      const signInError = await signInWithEmail(email, password);
      if (signInError) {
        setError(signInError);
        setEmailLoading(false);
        return;
      }

      router.push(nextPath);
      router.refresh();
    })();
  }

  function handleGoogleSignIn() {
    void (async () => {
      setGoogleLoading(true);
      setError(null);

      const result = await signInWithGoogle(nextPath);
      if (result.error) {
        setError(result.error);
        setGoogleLoading(false);
      }
      // On success Supabase redirects away — keep loading state to prevent duplicate clicks.
    })();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="label-text">Email</span>
          <input
            type="email"
            className="input-field"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
            required
            autoComplete="email"
            disabled={authBusy}
          />
        </label>
        <label className="block">
          <span className="label-text">Password</span>
          <input
            type="password"
            className="input-field"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
            required
            autoComplete="current-password"
            disabled={authBusy}
          />
        </label>
        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn-primary w-full" disabled={authBusy}>
          {emailLoading ? 'Signing in…' : 'Log in'}
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wide">
          <span className="bg-white px-2 text-slate-500">Or</span>
        </div>
      </div>

      <button
        type="button"
        className="btn-google w-full"
        onClick={handleGoogleSignIn}
        disabled={authBusy}
      >
        <GoogleIcon className="h-5 w-5" />
        {googleLoading ? 'Redirecting to Google…' : 'Continue with Google'}
      </button>
    </div>
  );
}

/** Registration form — backend provisioning creates application user + profile server-side. */
export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    void (async () => {
      setLoading(true);
      setError(null);

      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, display_name: displayName }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: { message?: string } };
        setError(body.error?.message ?? 'Registration failed');
        setLoading(false);
        return;
      }

      const signInError = await signInWithEmail(email, password);
      if (signInError) {
        setError('Account created — please sign in manually');
        setLoading(false);
        router.push('/login');
        return;
      }

      router.push('/app');
      router.refresh();
    })();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="label-text">Display name</span>
        <input
          type="text"
          className="input-field"
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value);
          }}
          required
          maxLength={100}
        />
      </label>
      <label className="block">
        <span className="label-text">Email</span>
        <input
          type="email"
          className="input-field"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
          required
          autoComplete="email"
        />
      </label>
      <label className="block">
        <span className="label-text">Password</span>
        <input
          type="password"
          className="input-field"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
          required
          minLength={8}
          autoComplete="new-password"
        />
      </label>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? 'Creating account…' : 'Create account'}
      </button>
      <p className="text-sm text-slate-600">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-pitch-700 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

/** Signs out via Supabase and clears cookie session. */
export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function handleLogout() {
    void (async () => {
      setLoading(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    })();
  }

  return (
    <button type="button" onClick={handleLogout} disabled={loading} className="btn-secondary">
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
