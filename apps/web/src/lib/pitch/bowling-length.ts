import type { PitchTarget } from '@bowling-machine/api-contracts';
import { clamp01 } from './pitch-layout';

/**
 * Standard cricket pitch length between the bowling creases (Law 7).
 *
 * This is a documented DOMAIN / UI reference constant for coaching-oriented
 * length classification and distance display. It is NOT machine geometry and
 * must NEVER be treated as a calibrated bowling-machine measurement.
 */
export const CRICKET_PITCH_LENGTH_M = 20.12;

/** Coaching-oriented bowling-length categories derived from where the ball pitches. */
export type BowlingLengthCategory = 'YORKER' | 'FULL' | 'GOOD_LENGTH' | 'SHORT' | 'BOUNCER';

/**
 * One length zone along the pitch, measured as distance from the batter's crease.
 *
 * Zones are ordered from batter end → bowler end. Boundaries are inclusive at
 * `minDistanceFromBatterM` and exclusive at `maxDistanceFromBatterM`, except the
 * final zone which includes the far boundary.
 */
export type BowlingLengthZone = {
  category: BowlingLengthCategory;
  /** Player-facing label shown in the UI. */
  label: string;
  /** Inclusive minimum distance from the batter's crease (metres). */
  minDistanceFromBatterM: number;
  /** Exclusive maximum distance from the batter's crease (metres), inclusive for the last zone. */
  maxDistanceFromBatterM: number;
  /** Soft fill tint used by the 2D zone bands (RGBA). */
  fill: string;
  /** Solid accent used by the 3D zone bands. */
  solid: string;
};

/**
 * SINGLE SOURCE OF TRUTH for bowling-length zone boundaries.
 *
 * Distances are metres from the batter's crease toward the bowler.
 * Adjust these coaching ranges here — 2D markings and classification both read this list.
 *
 * Approximate coaching intent:
 * - Yorker: near the toes / popping crease
 * - Full: fuller than a good length
 * - Good Length: classic attacking length
 * - Short: short of a length
 * - Bouncer: pitched short so the ball rises steeply
 */
export const BOWLING_LENGTH_ZONES: readonly BowlingLengthZone[] = [
  {
    category: 'YORKER',
    label: 'Yorker',
    minDistanceFromBatterM: 0,
    maxDistanceFromBatterM: 2.0,
    fill: 'rgba(248, 113, 113, 0.10)',
    solid: '#f87171',
  },
  {
    category: 'FULL',
    label: 'Full',
    minDistanceFromBatterM: 2.0,
    maxDistanceFromBatterM: 4.5,
    fill: 'rgba(251, 191, 36, 0.09)',
    solid: '#fbbf24',
  },
  {
    category: 'GOOD_LENGTH',
    label: 'Good Length',
    minDistanceFromBatterM: 4.5,
    maxDistanceFromBatterM: 8.0,
    fill: 'rgba(52, 211, 153, 0.10)',
    solid: '#34d399',
  },
  {
    category: 'SHORT',
    label: 'Short',
    minDistanceFromBatterM: 8.0,
    maxDistanceFromBatterM: 12.5,
    fill: 'rgba(96, 165, 250, 0.09)',
    solid: '#60a5fa',
  },
  {
    category: 'BOUNCER',
    label: 'Bouncer',
    minDistanceFromBatterM: 12.5,
    maxDistanceFromBatterM: CRICKET_PITCH_LENGTH_M,
    fill: 'rgba(167, 139, 250, 0.10)',
    solid: '#a78bfa',
  },
] as const;

/** Lateral line across the pitch width — RHB-oriented labels from the bowler's view. */
export type LateralLine = 'OFF' | 'MIDDLE' | 'LEG';

export type BowlingLengthAnalysis = {
  category: BowlingLengthCategory;
  label: string;
  /** Metres from batter's crease toward the bowler. */
  distanceFromBatterM: number;
  /** Metres from bowler's crease toward the batter. */
  distanceFromBowlerM: number;
  zone: BowlingLengthZone;
  lateral: LateralLine;
  lateralLabel: string;
};

/**
 * Converts normalized target_y (0 = bowler, 1 = batter) into metres from the batter's crease.
 * Pure function — no React, no machine calibration.
 */
export function distanceFromBatterMetres(targetY: number): number {
  return (1 - clamp01(targetY)) * CRICKET_PITCH_LENGTH_M;
}

/** Metres from the bowler's crease toward the batter. */
export function distanceFromBowlerMetres(targetY: number): number {
  return clamp01(targetY) * CRICKET_PITCH_LENGTH_M;
}

/** Converts a metre distance from the batter's crease back into normalized target_y. */
export function targetYFromDistanceFromBatter(distanceFromBatterM: number): number {
  const clamped = Math.min(Math.max(distanceFromBatterM, 0), CRICKET_PITCH_LENGTH_M);
  return 1 - clamped / CRICKET_PITCH_LENGTH_M;
}

/**
 * Classifies a metre distance from the batter's crease into a bowling-length zone.
 * Boundary values belong to the zone whose min matches the distance (deterministic).
 */
export function getZoneForDistanceFromBatter(distanceFromBatterM: number): BowlingLengthZone {
  const distance = Math.min(Math.max(distanceFromBatterM, 0), CRICKET_PITCH_LENGTH_M);
  const lastZone = BOWLING_LENGTH_ZONES.at(-1);
  if (!lastZone) {
    throw new Error('BOWLING_LENGTH_ZONES must contain at least one zone');
  }

  for (const zone of BOWLING_LENGTH_ZONES) {
    const isLast = zone.category === lastZone.category;
    if (
      distance >= zone.minDistanceFromBatterM &&
      (isLast ? distance <= zone.maxDistanceFromBatterM : distance < zone.maxDistanceFromBatterM)
    ) {
      return zone;
    }
  }

  return lastZone;
}

/**
 * Lateral classification using a right-handed batter convention:
 * from the bowler's view looking toward the batter, Off is left (low target_x)
 * and Leg is right (high target_x). Display-only — never sent to the calculation engine.
 */
export function getLateralLine(targetX: number): { lateral: LateralLine; lateralLabel: string } {
  const x = clamp01(targetX);
  if (x < 0.35) {
    return { lateral: 'OFF', lateralLabel: 'Off side' };
  }
  if (x > 0.65) {
    return { lateral: 'LEG', lateralLabel: 'Leg side' };
  }
  return { lateral: 'MIDDLE', lateralLabel: 'Middle stump' };
}

/**
 * Derives bowling-length category, distance, and lateral line from a normalized pitch target.
 *
 * This is UI/domain interpretation only. The backend still receives target_x / target_y —
 * never replace those with the length category when building delivery requests.
 */
export function getBowlingLengthFromTarget(target: PitchTarget): BowlingLengthAnalysis {
  const distanceFromBatterM = distanceFromBatterMetres(target.target_y);
  const distanceFromBowlerM = distanceFromBowlerMetres(target.target_y);
  const zone = getZoneForDistanceFromBatter(distanceFromBatterM);
  const { lateral, lateralLabel } = getLateralLine(target.target_x);

  return {
    category: zone.category,
    label: zone.label,
    distanceFromBatterM,
    distanceFromBowlerM,
    zone,
    lateral,
    lateralLabel,
  };
}

/** Formats a distance for player-facing UI (one decimal place, metres). */
export function formatPitchDistanceM(metres: number): string {
  return `${metres.toFixed(1)} m`;
}
