/** Maps OAuth/login query error codes to user-safe messages — no internal details. */
export function getAuthErrorMessage(code: string | null | undefined): string | null {
  switch (code) {
    case 'oauth_cancelled':
      return 'Google sign-in was cancelled. Please try again.';
    case 'auth_callback_failed':
      return 'Sign-in could not be completed. Please try again.';
    case 'oauth_provider_disabled':
      return 'Google sign-in is not available right now. Use email and password instead.';
    default:
      return null;
  }
}

/** Maps Supabase OAuth client errors to stable UI messages. */
export function mapSupabaseOAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('provider') && lower.includes('disabled')) {
    return 'Google sign-in is not available right now. Use email and password instead.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Network error during sign-in. Check your connection and try again.';
  }
  return 'Google sign-in failed. Please try again or use email and password.';
}
