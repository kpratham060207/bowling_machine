/**
 * Drizzle Kit configuration placeholder.
 * Schema paths and migrations will be added in Phase 1B+.
 *
 * Usage (future): pnpm --filter @bowling-machine/database db:generate
 */
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    // Read from DATABASE_URL at runtime in later phases — not hard-coded here.
    url:
      process.env['DATABASE_URL'] ?? 'postgresql://bowling:changeme@localhost:5432/bowling_machine',
  },
});
