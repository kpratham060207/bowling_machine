import type { PitchTarget } from '@bowling-machine/api-contracts';
import type { PitchCoordinateMapper } from './types.js';
import type { PitchReferenceCoordinate } from '../types/pitch-reference.js';

/**
 * Deterministic SIMULATION ONLY pitch coordinate mapper.
 *
 * Applies a simple perspective-aware length correction so target_y is not treated
 * as linear physical distance. Does NOT use DOM/CSS/viewport data.
 *
 * Replace this implementation when real pitch geometry is calibrated.
 */
export class SimulationPitchCoordinateMapper implements PitchCoordinateMapper {
  /**
   * Simulated perspective exponent for length axis — NOT measured from hardware.
   * Values < 1 compress bowler-end selections slightly (visual perspective simulation).
   */
  constructor(private readonly lengthPerspectiveExponent = 0.85) {}

  map(target: PitchTarget): PitchReferenceCoordinate {
    const reference_x = clamp01(target.target_x);
    // Clamp before pow — fractional exponent on negative values yields NaN.
    const normalized_y = clamp01(target.target_y);
    // Simulated non-linear length mapping — NOT physical metres.
    const reference_y = clamp01(Math.pow(normalized_y, this.lengthPerspectiveExponent));

    return {
      reference_x,
      reference_y,
      simulation: true,
    };
  }
}

function clamp01(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}
