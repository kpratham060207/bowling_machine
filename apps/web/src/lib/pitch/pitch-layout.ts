/**
 * Visual pitch layout constants for the interactive SVG pitch.
 *
 * These define the perspective trapezoid in viewBox space — NOT physical metres.
 * target_x/target_y remain normalized logical coordinates from the api-contracts layer.
 */

/** Fixed viewBox dimensions — aspect ratio stays constant when the SVG scales. */
export const PITCH_VIEWBOX = {
  width: 100,
  height: 160,
} as const;

export type PitchLayout = {
  /** Matches simulation backend perspective exponent for consistent Y semantics. */
  perspectiveExponent: number;
  /** Batter end — far/top of the perspective view. */
  topY: number;
  /** Bowler end — near/bottom of the perspective view. */
  bottomY: number;
  topLeftX: number;
  topRightX: number;
  bottomLeftX: number;
  bottomRightX: number;
};

/** Default perspective layout used by the interactive pitch component. */
export const DEFAULT_PITCH_LAYOUT: PitchLayout = {
  perspectiveExponent: 0.85,
  topY: 18,
  bottomY: 138,
  topLeftX: 32,
  topRightX: 68,
  bottomLeftX: 8,
  bottomRightX: 92,
};

/** Linear interpolation helper for trapezoid edge positions. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Clamps a value into the normalized 0..1 domain. */
export function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
