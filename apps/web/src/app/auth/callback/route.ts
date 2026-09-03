import { NextResponse } from 'next/server';
import type { Player } from '@bowling-machine/api-contracts';
import { sanitizeAuthRedirectPath } from '@/lib/auth/safe-redirect';
import { getApiBaseUrl } from '@/lib/supabase/client';
import { createClient, getServerUser } from '@/lib/supabase/server';

/**
 * OAuth/email confirmation callback — exchanges Supabase PKCE auth code for session cookies.
 * Google OAuth and email magic links both land here after provider redirect.
 *
 * Post-auth redirects use the request origin only (the host that received the
 * callback). Do not use NEXT_PUBLIC_APP_URL here — it may still say :3000 while
 * this request arrived on :3004.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const oauthError = requestUrl.searchParams.get('error');
  const nextPath = sanitizeAuthRedirectPath(requestUrl.searchParams.get('next'));
  const appOrigin = requestUrl.origin;

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

  /**
   * We use the access token from the freshly created session to ask the
   * application API whether this account has already claimed a username.
   */
  const user = await getServerUser();
  if (!user) {
    return NextResponse.redirect(`${appOrigin}${nextPath}`);
  }

  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    return NextResponse.redirect(`${appOrigin}${nextPath}`);
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/v1/profile`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });

    if (response.ok) {
      const body = (await response.json()) as { data?: Player };
      if (!body.data?.username) {
        return NextResponse.redirect(`${appOrigin}/app/profile?prompt=username`);
      }
    }
  } catch {
    // Keep the existing success redirect behavior when the profile check is unavailable.
  }

  return NextResponse.redirect(`${appOrigin}${nextPath}`);
}
