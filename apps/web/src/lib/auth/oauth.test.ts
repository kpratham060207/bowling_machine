import { describe, expect, it } from 'vitest';
import { buildOAuthRedirectTo } from '@/lib/auth/oauth';

describe('buildOAuthRedirectTo', () => {
  it('uses the provided live origin even when it is not port 3000', () => {
    expect(buildOAuthRedirectTo('http://localhost:3004', '/app')).toBe(
      'http://localhost:3004/auth/callback?next=%2Fapp',
    );
  });

  it('works for the default localhost:3000 origin', () => {
    expect(buildOAuthRedirectTo('http://localhost:3000', '/app/practice')).toBe(
      'http://localhost:3000/auth/callback?next=%2Fapp%2Fpractice',
    );
  });

  it('sanitizes unsafe next paths', () => {
    expect(buildOAuthRedirectTo('http://localhost:3004', 'https://evil.example')).toBe(
      'http://localhost:3004/auth/callback?next=%2Fapp',
    );
  });
});
