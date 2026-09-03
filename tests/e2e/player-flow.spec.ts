import { test, expect } from '@playwright/test';

/**
 * Phase 1H-A player flow E2E.
 *
 * LIMITATION: Full login requires Supabase credentials (NEXT_PUBLIC_SUPABASE_*).
 * When unavailable, tests document expected routes via unauthenticated redirects.
 * Production auth behavior is unchanged — this avoids weakening security for CI.
 */
test.describe('player web foundation', () => {
  test('redirects unauthenticated users from /app to login', async ({ page }) => {
    await page.goto('/app');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page renders sign-in form and Google button', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    // Phase 1K: one identifier field accepts email or username.
    await expect(page.getByLabel('Email or Username')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  });

  test('protected route preserves return path on login redirect', async ({ page }) => {
    await page.goto('/app/practice');
    await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fpractice/);
  });

  test('register page renders create account form', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();
    // Phase 1K registration: Username replaces the old Display name field.
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Confirm password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  });
});
