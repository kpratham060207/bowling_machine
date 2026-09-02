/**
 * @bowling-machine/database
 *
 * Drizzle ORM schema, migrations, connection factory, and seed tooling.
 * Backend-only — do not import from frontend or api-contracts consumers.
 */

export * from './schema/index';
export { createDatabase, getDatabaseUrl, type Database } from './client';
export { runMigrations } from './migrate';
export { seedDevelopmentData, SEED_IDS } from './seed';
