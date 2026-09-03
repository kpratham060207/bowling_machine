/**
 * Application base URL for OAuth redirectTo and post-auth redirects.
 *
 * Prefer the live origin (browser window or the callback request) so PKCE
 * cookies stay on the same host:port as the running Next.js app. Next.js often
 * binds 3004+ when 3000 is already taken; NEXT_PUBLIC_APP_URL may still say 3000.
 *
 * NEXT_PUBLIC_APP_URL is the fallback when no live origin is available.
 */
export function getAppBaseUrl(fallbackOrigin?: string): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }

  if (fallbackOrigin) {
    return fallbackOrigin.replace(/\/$/, '');
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  return 'http://localhost:3000';
}
