import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for future end-to-end tests.
 * Phase 1A: structural setup only — no application features under test yet.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list']],
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Web server will be wired in Phase 1B+ when the app has testable routes.
  // webServer: {
  //   command: 'pnpm --filter @bowling-machine/web dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
