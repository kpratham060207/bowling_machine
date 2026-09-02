/**
 * @vitest-environment happy-dom
 */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from '@/components/auth-forms';

const signInWithGoogleMock = vi.fn();
const signInWithPasswordMock = vi.fn();

vi.mock('@/lib/auth/oauth', () => ({
  signInWithGoogle: (...args: unknown[]) => signInWithGoogleMock(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: (...args: unknown[]) => signInWithPasswordMock(...args),
    },
  }),
  getApiBaseUrl: () => 'http://localhost:4000',
}));

describe('LoginForm', () => {
  beforeEach(() => {
    signInWithGoogleMock.mockReset();
    signInWithPasswordMock.mockReset();
    signInWithGoogleMock.mockResolvedValue({ error: null });
    signInWithPasswordMock.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders email/password fields and Google sign-in button', () => {
    render(<LoginForm nextPath="/app/practice" />);

    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Log in' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeTruthy();
  });

  it('starts Google OAuth flow with the safe return path', async () => {
    render(<LoginForm nextPath="/app/practice" />);

    await userEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(signInWithGoogleMock).toHaveBeenCalledWith('/app/practice');
    expect(
      screen.getByRole('button', { name: 'Redirecting to Google…' }).hasAttribute('disabled'),
    ).toBe(true);
  });

  it('shows OAuth error from the login page', () => {
    render(
      <LoginForm nextPath="/app" initialError="Google sign-in was cancelled. Please try again." />,
    );

    expect(screen.getByText('Google sign-in was cancelled. Please try again.')).toBeTruthy();
  });

  it('displays Google provider error returned by signInWithGoogle', async () => {
    signInWithGoogleMock.mockResolvedValue({
      error: 'Google sign-in is not available right now. Use email and password instead.',
    });

    render(<LoginForm />);
    await userEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(
      await screen.findByText(
        'Google sign-in is not available right now. Use email and password instead.',
      ),
    ).toBeTruthy();
  });
});
