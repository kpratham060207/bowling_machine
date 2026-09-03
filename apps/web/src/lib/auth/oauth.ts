import { createClient } from '@/lib/supabase/client';
import { mapSupabaseOAuthError } from '@/lib/auth/oauth-errors';
import { sanitizeAuthRedirectPath } from '@/lib/auth/safe-redirect';

/**
 * Builds the Supabase OAuth redirectTo URL for a known origin.
 * Origin must be the live tab host:port (e.g. http://localhost:3004) — never a
 * stale NEXT_PUBLIC_APP_URL that may still point at :3000.
 */
export function buildOAuthRedirectTo(origin: string, nextPath?: string): string {
  const base = origin.replace(/\/$/, '');
  const safeNext = sanitizeAuthRedirectPath(nextPath);
  return `${base}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}

/**
 * Starts Supabase Google OAuth (PKCE). Supabase redirects the browser to Google,
 * then back to /auth/callback where the code is exchanged for cookie session.
 *
 * Always uses window.location.origin so PKCE cookies and the callback share the
 * same host:port when Next.js binds 3001/3004/etc. instead of 3000.
 */
export async function signInWithGoogle(nextPath?: string): Promise<{ error: string | null }> {
  if (typeof window === 'undefined') {
    return { error: 'Google sign-in must be started from the browser.' };
  }

  const supabase = createClient();
  const redirectTo = buildOAuthRedirectTo(window.location.origin, nextPath);

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });

  if (error) {
    return { error: mapSupabaseOAuthError(error.message) };
  }

  return { error: null };
}
