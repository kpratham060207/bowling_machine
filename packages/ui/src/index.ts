/**
 * @bowling-machine/ui
 *
 * PLACEHOLDER — Phase 1A foundation only.
 *
 * This package will hold shared shadcn/ui-based components such as PitchMapSelector.
 * Do not add feature components until Phase 1B+.
 */

/** Monorepo phase marker used by smoke tests to verify package wiring. */
export const UI_PLACEHOLDER = 'phase-1a-foundation' as const;

export type UiPhase = typeof UI_PLACEHOLDER;
