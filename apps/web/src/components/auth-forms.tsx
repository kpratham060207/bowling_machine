'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type SubmitEvent } from 'react';
import { createClient, getApiBaseUrl } from '@/lib/supabase/client';

async function signInWithEmail(email: string, password: string): Promise<string | null> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? 'Invalid email or password' : null;
}

/**
 * Login form — credentials go to Supabase Auth; session stored in HTTP-only cookies via SSR.
 */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    void (async () => {
      setLoading(true);
      setError(null);

      const signInError = await signInWithEmail(email, password);
      if (signInError) {
        setError(signInError);
        setLoading(false);
        return;
      }

      router.push('/profile');
      router.refresh();
    })();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem', maxWidth: '24rem' }}>
      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
          required
          autoComplete="email"
          style={{ display: 'block', width: '100%', marginTop: '0.25rem' }}
        />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
          required
          autoComplete="current-password"
          style={{ display: 'block', width: '100%', marginTop: '0.25rem' }}
        />
      </label>
      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
      <button type="submit" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
      <p>
        No account? <Link href="/register">Create one</Link>
      </p>
    </form>
  );
}

/**
 * Registration form — backend provisioning creates application user + profile server-side.
 */
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
        body: JSON.stringify({
          email,
          password,
          display_name: displayName,
        }),
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

      router.push('/profile');
      router.refresh();
    })();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem', maxWidth: '24rem' }}>
      <label>
        Display name
        <input
          type="text"
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value);
          }}
          required
          maxLength={100}
          style={{ display: 'block', width: '100%', marginTop: '0.25rem' }}
        />
      </label>
      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
          required
          autoComplete="email"
          style={{ display: 'block', width: '100%', marginTop: '0.25rem' }}
        />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
          required
          minLength={8}
          autoComplete="new-password"
          style={{ display: 'block', width: '100%', marginTop: '0.25rem' }}
        />
      </label>
      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
      <button type="submit" disabled={loading}>
        {loading ? 'Creating account…' : 'Create account'}
      </button>
      <p>
        Already have an account? <Link href="/login">Sign in</Link>
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
    <button type="button" onClick={handleLogout} disabled={loading}>
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
