import { createServerClient } from '@supabase/ssr';
import type { ApiEnv } from '../config/env.js';

type CookiePair = { name: string; value: string };

/**
 * Parses a raw Cookie header into name/value pairs for Supabase SSR session lookup.
 * WebSocket upgrade requests include cookies when the browser sends credentials.
 */
function parseCookieHeader(cookieHeader: string | undefined): CookiePair[] {
  if (!cookieHeader) {
    return [];
  }

  return cookieHeader.split(';').flatMap((part) => {
    const trimmed = part.trim();
    if (!trimmed) {
      return [];
    }
    const separator = trimmed.indexOf('=');
    if (separator <= 0) {
      return [];
    }
    const name = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1);
    return [{ name, value }];
  });
}

/** Derives Supabase project ref from project URL — used for SSR cookie names. */
export function getSupabaseProjectRef(supabaseUrl: string): string {
  return new URL(supabaseUrl).hostname.split('.')[0] ?? '';
}

/**
 * Reads Supabase access token from SSR auth cookies on an incoming request.
 *
 * Compatible with @supabase/ssr cookie storage used by the Next.js web app.
 * Does not log or persist tokens — returns null when cookies are absent/invalid.
 */
export async function getAccessTokenFromSupabaseCookies(
  env: ApiEnv,
  cookieHeader: string | undefined,
): Promise<string | null> {
  const cookies = parseCookieHeader(cookieHeader);
  if (cookies.length === 0) {
    return null;
  }

  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookies;
      },
      setAll() {
        // WebSocket auth is read-only — no cookie writes on the API during WS upgrade.
      },
    },
  });

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    return null;
  }

  return data.session.access_token;
}
