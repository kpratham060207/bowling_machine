import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET } from '@/app/auth/callback/route';

const exchangeCodeForSessionMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        exchangeCodeForSession: (...args: unknown[]) => exchangeCodeForSessionMock(...args),
      },
    }),
}));

describe('auth callback route', () => {
  beforeEach(() => {
    exchangeCodeForSessionMock.mockReset();
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3004';
  });

  it('keeps post-auth redirects on the callback origin even if NEXT_PUBLIC_APP_URL differs', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    exchangeCodeForSessionMock.mockResolvedValue({ error: null });

    const response = await GET(
      new Request('http://localhost:3004/auth/callback?code=test-code&next=/app'),
    );

    expect(response.headers.get('location')).toBe('http://localhost:3004/app');
  });

  it('exchanges a valid code and redirects to the safe destination', async () => {
    exchangeCodeForSessionMock.mockResolvedValue({ error: null });

    const response = await GET(
      new Request('http://localhost:3004/auth/callback?code=test-code&next=/app/practice'),
    );

    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith('test-code');
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3004/app/practice');
  });

  it('rejects open redirect destinations', async () => {
    exchangeCodeForSessionMock.mockResolvedValue({ error: null });

    const response = await GET(
      new Request('http://localhost:3004/auth/callback?code=test-code&next=https://evil.example'),
    );

    expect(response.headers.get('location')).toBe('http://localhost:3004/app');
  });

  it('redirects to login when code exchange fails', async () => {
    exchangeCodeForSessionMock.mockResolvedValue({ error: new Error('invalid code') });

    const response = await GET(
      new Request('http://localhost:3004/auth/callback?code=bad-code&next=/app'),
    );

    expect(response.headers.get('location')).toBe(
      'http://localhost:3004/login?error=auth_callback_failed&next=%2Fapp',
    );
  });

  it('redirects to login when OAuth provider returns an error', async () => {
    const response = await GET(
      new Request('http://localhost:3004/auth/callback?error=access_denied&next=/app/practice'),
    );

    expect(response.headers.get('location')).toBe(
      'http://localhost:3004/login?error=oauth_cancelled&next=%2Fapp%2Fpractice',
    );
  });
});
