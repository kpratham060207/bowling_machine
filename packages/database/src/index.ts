/**
 * @bowling-machine/database
 *
 * PLACEHOLDER — Phase 1A foundation only.
 *
 * This package will contain:
 * - Drizzle schema definitions
 * - SQL migrations
 * - Database client factory
 *
 * Do not add business tables or migrations until Phase 1B+.
 */

/** Monorepo phase marker used by smoke tests to verify package wiring. */
export const DATABASE_PLACEHOLDER = 'phase-1a-foundation' as const;

export type DatabasePhase = typeof DATABASE_PLACEHOLDER;
