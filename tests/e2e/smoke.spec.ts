import { test, expect } from '@playwright/test';

/**
 * Playwright smoke test — verifies the test runner is configured.
 * Application E2E flows will be added in Phase 1B+.
 */
test('playwright configuration smoke test', async ({ page }) => {
  await page.goto('about:blank');
  await expect(page).toHaveTitle('');
});
