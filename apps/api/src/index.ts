/**
 * @bowling-machine/api — application entry point
 *
 * PLACEHOLDER — Phase 1A foundation only.
 *
 * This file verifies workspace package wiring. It does NOT:
 * - Start an HTTP server
 * - Implement authentication
 * - Connect to PostgreSQL
 * - Handle machine protocol / WebSocket traffic
 *
 * Fastify server bootstrap will be added in Phase 1B+.
 */
import { PROTOCOL_VERSION } from '@bowling-machine/api-contracts';
import { DATABASE_PLACEHOLDER } from '@bowling-machine/database';
import { SHARED_PLACEHOLDER } from '@bowling-machine/shared';

/** Phase marker logged when running `pnpm --filter @bowling-machine/api dev`. */
export const API_APP_PLACEHOLDER = 'phase-1a-foundation' as const;

/**
 * Minimal bootstrap used by the dev script to confirm the app package resolves.
 * Not a production server — intentionally side-effect free beyond this log.
 */
export function main(): void {
  console.log('[api] placeholder only — no server started');
  console.log('[api] phase:', API_APP_PLACEHOLDER);
  console.log('[api] protocol version:', PROTOCOL_VERSION);
  console.log('[api] database:', DATABASE_PLACEHOLDER);
  console.log('[api] shared:', SHARED_PLACEHOLDER);
}

// Execute when run directly via tsx (development placeholder).
main();
