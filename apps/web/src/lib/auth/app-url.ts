/**
 * Application base URL for OAuth redirectTo and post-auth redirects.
 * Prefer NEXT_PUBLIC_APP_URL so OAuth works when Next.js picks a non-3000 port.
 */
export function getAppBaseUrl(fallbackOrigin?: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  if (fallbackOrigin) {
    return fallbackOrigin.replace(/\/$/, '');
  }

  return 'http://localhost:3000';
}
