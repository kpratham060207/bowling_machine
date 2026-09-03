import { describe, expect, it } from 'vitest';
import { getAppBaseUrl } from '@/lib/auth/app-url';

describe('getAppBaseUrl', () => {
  it('prefers the live request origin over NEXT_PUBLIC_APP_URL', () => {
    const previous = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

    expect(getAppBaseUrl('http://localhost:3004')).toBe('http://localhost:3004');

    process.env.NEXT_PUBLIC_APP_URL = previous;
  });

  it('falls back to NEXT_PUBLIC_APP_URL when no live origin is available', () => {
    const previous = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

    expect(getAppBaseUrl()).toBe('http://localhost:3000');

    process.env.NEXT_PUBLIC_APP_URL = previous;
  });
});
