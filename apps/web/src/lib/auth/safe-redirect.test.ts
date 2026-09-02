import { describe, expect, it } from 'vitest';
import { DEFAULT_AUTH_DESTINATION, sanitizeAuthRedirectPath } from '@/lib/auth/safe-redirect';

describe('sanitizeAuthRedirectPath', () => {
  it('returns default when path is missing', () => {
    expect(sanitizeAuthRedirectPath(undefined)).toBe(DEFAULT_AUTH_DESTINATION);
    expect(sanitizeAuthRedirectPath(null)).toBe(DEFAULT_AUTH_DESTINATION);
    expect(sanitizeAuthRedirectPath('')).toBe(DEFAULT_AUTH_DESTINATION);
  });

  it('allows safe internal paths', () => {
    expect(sanitizeAuthRedirectPath('/app')).toBe('/app');
    expect(sanitizeAuthRedirectPath('/app/practice')).toBe('/app/practice');
    expect(sanitizeAuthRedirectPath('/app/profile')).toBe('/app/profile');
  });

  it('rejects open redirect attempts', () => {
    expect(sanitizeAuthRedirectPath('https://evil.example')).toBe(DEFAULT_AUTH_DESTINATION);
    expect(sanitizeAuthRedirectPath('//evil.example')).toBe(DEFAULT_AUTH_DESTINATION);
    expect(sanitizeAuthRedirectPath('/app/https://evil.example')).toBe(DEFAULT_AUTH_DESTINATION);
    expect(sanitizeAuthRedirectPath('http://evil.example')).toBe(DEFAULT_AUTH_DESTINATION);
  });
});
