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
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:3011' },
    },
  ],
  webServer: {
    command:
      'NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=e2e-anon-key NEXT_PUBLIC_API_URL=http://localhost:4000 PORT=3011 pnpm --filter @bowling-machine/web start',
    url: 'http://127.0.0.1:3011',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
