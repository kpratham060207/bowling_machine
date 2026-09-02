/** Default post-auth destination when no safe return path is provided. */
export const DEFAULT_AUTH_DESTINATION = '/app';

/**
 * Validates an internal post-login redirect path.
 * Rejects absolute URLs, protocol-relative paths, and other open-redirect vectors.
 */
export function sanitizeAuthRedirectPath(path: string | null | undefined): string {
  if (!path || typeof path !== 'string') {
    return DEFAULT_AUTH_DESTINATION;
  }

  const trimmed = path.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return DEFAULT_AUTH_DESTINATION;
  }

  if (trimmed.includes('://') || trimmed.includes('\\')) {
    return DEFAULT_AUTH_DESTINATION;
  }

  return trimmed;
}
