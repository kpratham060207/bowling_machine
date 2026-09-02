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

  test('login page renders sign-in form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('register page renders create account form', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();
    await expect(page.getByLabel('Display name')).toBeVisible();
  });
});
