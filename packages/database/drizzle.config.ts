/**
 * Drizzle Kit configuration.
 * Usage: pnpm db:generate | pnpm db:migrate | pnpm db:seed
 */
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    url:
      process.env['DATABASE_URL'] ?? 'postgresql://bowling:changeme@localhost:5432/bowling_machine',
  },
});
