import type { PitchTarget } from '@bowling-machine/api-contracts';
import type { PitchReferenceCoordinate } from '../types/pitch-reference.js';

/**
 * Maps normalized pitch target coordinates to pitch reference coordinates.
 * Replaceable — simulation mapper today, geometry-aware mapper after calibration.
 */
export interface PitchCoordinateMapper {
  map(target: PitchTarget): PitchReferenceCoordinate;
}
