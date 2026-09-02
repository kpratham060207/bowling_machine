/**
 * Database connection factory — backend-only; never import from browser/frontend.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { schema } from './schema/index';

export type Database = ReturnType<typeof createDatabase>;

/**
 * Creates a Drizzle database client from DATABASE_URL.
 * Caller owns connection lifecycle — call sql.end() when shutting down.
 */
export function createDatabase(connectionString: string) {
  const sql = postgres(connectionString, { max: 10 });
  const db = drizzle(sql, { schema });
  return { db, sql };
}

/** Reads DATABASE_URL from environment or falls back to local Docker Compose default. */
export function getDatabaseUrl(): string {
  return (
    process.env['DATABASE_URL'] ?? 'postgresql://bowling:changeme@localhost:5432/bowling_machine'
  );
}
