import {
  BOWLING_LENGTH_ZONES,
  targetYFromDistanceFromBatter,
  type BowlingLengthCategory,
  type BowlingLengthZone,
} from './bowling-length';
import { normalizedToViewBox } from './coordinate-mapper';
import { DEFAULT_PITCH_LAYOUT, type PitchLayout } from './pitch-layout';

/**
 * Builds an SVG polygon for a length-zone band across the perspective pitch.
 * Uses the shared length-zone config so markings stay aligned with classification.
 */
export function zoneBandPolygonPoints(
  zone: BowlingLengthZone,
  layout: PitchLayout = DEFAULT_PITCH_LAYOUT,
): string {
  // Near-batter edge of the zone (smaller distance from batter → higher target_y).
  const yNearBatter = targetYFromDistanceFromBatter(zone.minDistanceFromBatterM);
  const yNearBowler = targetYFromDistanceFromBatter(zone.maxDistanceFromBatterM);

  const topLeft = normalizedToViewBox({ target_x: 0, target_y: yNearBatter }, layout);
  const topRight = normalizedToViewBox({ target_x: 1, target_y: yNearBatter }, layout);
  const bottomRight = normalizedToViewBox({ target_x: 1, target_y: yNearBowler }, layout);
  const bottomLeft = normalizedToViewBox({ target_x: 0, target_y: yNearBowler }, layout);

  return `${topLeft.vx},${topLeft.vy} ${topRight.vx},${topRight.vy} ${bottomRight.vx},${bottomRight.vy} ${bottomLeft.vx},${bottomLeft.vy}`;
}

/** Label anchor for a zone — mid-band, just outside the left pitch edge. */
export function zoneLabelAnchor(
  zone: BowlingLengthZone,
  layout: PitchLayout = DEFAULT_PITCH_LAYOUT,
): { x: number; y: number } {
  const midDistance = (zone.minDistanceFromBatterM + zone.maxDistanceFromBatterM) / 2;
  const midY = targetYFromDistanceFromBatter(midDistance);
  const leftEdge = normalizedToViewBox({ target_x: 0, target_y: midY }, layout);
  return { x: Math.max(2, leftEdge.vx - 7), y: leftEdge.vy + 1 };
}

/** Returns all zone band polygons derived from the central config. */
export function getAllZoneBandPolygons(layout: PitchLayout = DEFAULT_PITCH_LAYOUT): Array<{
  category: BowlingLengthCategory;
  points: string;
  fill: string;
  label: string;
  labelAnchor: { x: number; y: number };
}> {
  return BOWLING_LENGTH_ZONES.map((zone) => ({
    category: zone.category,
    points: zoneBandPolygonPoints(zone, layout),
    fill: zone.fill,
    label: zone.label,
    labelAnchor: zoneLabelAnchor(zone, layout),
  }));
}
