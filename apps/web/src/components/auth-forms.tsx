'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type SubmitEvent } from 'react';
import { GoogleIcon } from '@/components/google-icon';
import { signInWithGoogle } from '@/lib/auth/oauth';
import { createClient, getApiBaseUrl } from '@/lib/supabase/client';

/**
 * Username rules are mirrored on the client so we can give instant feedback
 * before the request reaches the backend.
 */
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

function validateUsername(username: string): string | null {
  const trimmedUsername = username.trim();

  if (trimmedUsername.length < 3 || trimmedUsername.length > 32) {
    return 'Username must be 3 to 32 characters long';
  }

  if (!USERNAME_PATTERN.test(trimmedUsername)) {
    return 'Username may only contain letters, numbers, underscore, or hyphen';
  }

  return null;
}

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
  const [identifier, setIdentifier] = useState('');
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

      const trimmedIdentifier = identifier.trim();
      let resolvedEmail = trimmedIdentifier;

      /**
       * The backend owns the username -> email mapping so the browser never
       * guesses or reconstructs email addresses locally.
       */
      if (!trimmedIdentifier.includes('@')) {
        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/api/v1/auth/lookup-identifier`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: trimmedIdentifier }),
        });

        if (!response.ok) {
          setError('Invalid email/username or password');
          setEmailLoading(false);
          return;
        }

        // The lookup endpoint returns plain { email } — no envelope wrapper.
        const body = (await response.json()) as Record<string, unknown>;
        const emailValue =
          typeof body['email'] === 'string'
            ? body['email']
            : // Handle a possible future envelope shape gracefully.
              typeof (body['data'] as Record<string, unknown> | undefined)?.['email'] === 'string'
              ? ((body['data'] as Record<string, unknown>)['email'] as string)
              : '';
        resolvedEmail = emailValue;

        if (!resolvedEmail) {
          setError('Invalid email/username or password');
          setEmailLoading(false);
          return;
        }
      }

      const signInError = await signInWithEmail(resolvedEmail, password);
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
          <span className="label-text">Email or Username</span>
          <input
            type="text"
            className="input-field"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
            }}
            required
            autoComplete="username"
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
        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-pitch-700 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
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
export function RegisterForm({ nextPath = '/app' }: { nextPath?: string } = {}) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const authBusy = loading || googleLoading;

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    void (async () => {
      const trimmedUsername = username.trim();
      const invalidUsernameMessage = validateUsername(trimmedUsername);
      if (invalidUsernameMessage) {
        setUsernameError(invalidUsernameMessage);
        setError(null);
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      setLoading(true);
      setError(null);
      setUsernameError(null);

      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        /**
         * We still send display_name for backward compatibility while the
         * backend rollout catches up. Username is the new primary field.
         */
        body: JSON.stringify({
          username: trimmedUsername,
          email,
          password,
          display_name: trimmedUsername,
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

      router.push(nextPath);
      router.refresh();
    })();
  }

  function handleGoogleSignIn() {
    void (async () => {
      setGoogleLoading(true);
      setError(null);
      setUsernameError(null);

      const result = await signInWithGoogle(nextPath);
      if (result.error) {
        setError(result.error);
        setGoogleLoading(false);
      }
    })();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="label-text">Username</span>
          <input
            type="text"
            className="input-field"
            value={username}
            onChange={(e) => {
              const nextUsername = e.target.value;
              setUsername(nextUsername);
              setUsernameError(validateUsername(nextUsername));
            }}
            onBlur={() => {
              setUsernameError(validateUsername(username));
            }}
            required
            autoComplete="username"
            disabled={authBusy}
          />
          {usernameError ? <p className="mt-1 text-sm text-red-700">{usernameError}</p> : null}
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
            minLength={8}
            autoComplete="new-password"
            disabled={authBusy}
          />
        </label>
        <label className="block">
          <span className="label-text">Confirm password</span>
          <input
            type="password"
            className="input-field"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
            }}
            required
            minLength={8}
            autoComplete="new-password"
            disabled={authBusy}
          />
        </label>
        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn-primary w-full" disabled={authBusy}>
          {loading ? 'Creating account…' : 'Create account'}
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

      <p className="text-sm text-slate-600">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-pitch-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

/** Forgot-password form — always shows a neutral success response for privacy. */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    void (async () => {
      setLoading(true);

      try {
        await fetch(`${getApiBaseUrl()}/api/v1/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
      } finally {
        /**
         * This message is intentionally generic so the page never reveals
         * whether a specific email address exists in the system.
         */
        setSubmitted(true);
        setLoading(false);
      }
    })();
  }

  return (
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
          disabled={loading}
        />
      </label>
      {submitted ? (
        <p className="text-sm text-green-700" role="status">
          If an account with this email exists, a reset link has been sent.
        </p>
      ) : null}
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? 'Sending reset link…' : 'Send reset link'}
      </button>
      <p className="text-sm text-slate-600">
        <Link href="/login" className="font-medium text-pitch-700 hover:underline">
          Back to sign in
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
