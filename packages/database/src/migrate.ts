/**
 * Applies pending Drizzle migrations from packages/database/drizzle/.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createDatabase, getDatabaseUrl } from './client';

const migrationsFolder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../drizzle');

export async function runMigrations(databaseUrl = getDatabaseUrl()): Promise<void> {
  const { db, sql } = createDatabase(databaseUrl);
  try {
    await migrate(db, { migrationsFolder });
  } finally {
    await sql.end();
  }
}

if (process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js')) {
  runMigrations()
    .then(() => {
      console.log('[database] migrations applied');
    })
    .catch((error: unknown) => {
      console.error('[database] migration failed:', error);
      process.exit(1);
    });
}
