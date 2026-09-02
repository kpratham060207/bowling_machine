/**
 * @bowling-machine/shared
 *
 * PLACEHOLDER — Phase 1A foundation only.
 *
 * This package will hold domain-independent utilities such as:
 * - Pitch Coordinate Mapper (see docs/frontend/PITCH_VISUALIZATION.md)
 * - Generic helpers with no business-logic coupling
 *
 * Do not move application business logic here for convenience.
 */

/** Monorepo phase marker used by smoke tests to verify package wiring. */
export const SHARED_PLACEHOLDER = 'phase-1a-foundation' as const;

export type SharedPhase = typeof SHARED_PLACEHOLDER;
