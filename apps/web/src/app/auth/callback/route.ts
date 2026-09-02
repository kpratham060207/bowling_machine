import { NextResponse } from 'next/server';
import { getAppBaseUrl } from '@/lib/auth/app-url';
import { sanitizeAuthRedirectPath } from '@/lib/auth/safe-redirect';
import { createClient } from '@/lib/supabase/server';

/**
 * OAuth/email confirmation callback — exchanges Supabase PKCE auth code for session cookies.
 * Google OAuth and email magic links both land here after provider redirect.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const oauthError = requestUrl.searchParams.get('error');
  const nextPath = sanitizeAuthRedirectPath(requestUrl.searchParams.get('next'));
  const appOrigin = getAppBaseUrl(requestUrl.origin);

  const loginWithError = (errorCode: string) => {
    const params = new URLSearchParams({ error: errorCode, next: nextPath });
    return NextResponse.redirect(`${appOrigin}/login?${params.toString()}`);
  };

  if (oauthError) {
    return loginWithError('oauth_cancelled');
  }

  if (!code) {
    return loginWithError('auth_callback_failed');
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return loginWithError('auth_callback_failed');
  }

  return NextResponse.redirect(`${appOrigin}${nextPath}`);
}
