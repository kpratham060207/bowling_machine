import { createClient } from '@/lib/supabase/client';
import { getAppBaseUrl } from '@/lib/auth/app-url';
import { mapSupabaseOAuthError } from '@/lib/auth/oauth-errors';
import { sanitizeAuthRedirectPath } from '@/lib/auth/safe-redirect';

/**
 * Starts Supabase Google OAuth (PKCE). Supabase redirects the browser to Google,
 * then back to /auth/callback where the code is exchanged for cookie session.
 */
export async function signInWithGoogle(nextPath?: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const safeNext = sanitizeAuthRedirectPath(nextPath);
  const redirectTo = `${getAppBaseUrl()}/auth/callback?next=${encodeURIComponent(safeNext)}`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });

  if (error) {
    return { error: mapSupabaseOAuthError(error.message) };
  }

  return { error: null };
}
