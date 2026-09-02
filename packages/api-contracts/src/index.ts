/**
 * @bowling-machine/api-contracts
 *
 * PLACEHOLDER — Phase 1A foundation only.
 *
 * This package will hold shared Zod schemas and TypeScript types for:
 * - REST API request/response shapes
 * - WebSocket event payloads
 * - Ball type and machine state enums
 *
 * Do not add business schemas here until Phase 1B (shared application contracts).
 */

/** Monorepo phase marker used by smoke tests to verify package wiring. */
export const API_CONTRACTS_PLACEHOLDER = 'phase-1a-foundation' as const;

export type ApiContractsPhase = typeof API_CONTRACTS_PLACEHOLDER;
