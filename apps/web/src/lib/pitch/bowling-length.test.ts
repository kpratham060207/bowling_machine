import { describe, expect, it } from 'vitest';
import {
  BOWLING_LENGTH_ZONES,
  CRICKET_PITCH_LENGTH_M,
  distanceFromBatterMetres,
  formatPitchDistanceM,
  getBowlingLengthFromTarget,
  getLateralLine,
  getZoneForDistanceFromBatter,
  targetYFromDistanceFromBatter,
} from './bowling-length';

describe('bowling-length domain', () => {
  it('uses the documented cricket pitch reference length', () => {
    expect(CRICKET_PITCH_LENGTH_M).toBe(20.12);
  });

  it('converts target_y to distance from batter deterministically', () => {
    expect(distanceFromBatterMetres(1)).toBeCloseTo(0, 5);
    expect(distanceFromBatterMetres(0)).toBeCloseTo(CRICKET_PITCH_LENGTH_M, 5);
    expect(distanceFromBatterMetres(0.5)).toBeCloseTo(CRICKET_PITCH_LENGTH_M / 2, 5);
  });

  it('round-trips distance ↔ target_y', () => {
    for (const metres of [0, 2, 4.5, 8, 12.5, CRICKET_PITCH_LENGTH_M]) {
      const y = targetYFromDistanceFromBatter(metres);
      expect(distanceFromBatterMetres(y)).toBeCloseTo(metres, 5);
    }
  });

  it('classifies each coaching zone from distance boundaries', () => {
    expect(getZoneForDistanceFromBatter(0).category).toBe('YORKER');
    expect(getZoneForDistanceFromBatter(1.9).category).toBe('YORKER');
    expect(getZoneForDistanceFromBatter(2.0).category).toBe('FULL');
    expect(getZoneForDistanceFromBatter(4.4).category).toBe('FULL');
    expect(getZoneForDistanceFromBatter(4.5).category).toBe('GOOD_LENGTH');
    expect(getZoneForDistanceFromBatter(7.9).category).toBe('GOOD_LENGTH');
    expect(getZoneForDistanceFromBatter(8.0).category).toBe('SHORT');
    expect(getZoneForDistanceFromBatter(12.4).category).toBe('SHORT');
    expect(getZoneForDistanceFromBatter(12.5).category).toBe('BOUNCER');
    expect(getZoneForDistanceFromBatter(CRICKET_PITCH_LENGTH_M).category).toBe('BOUNCER');
  });

  it('derives length automatically from a normalized pitch target', () => {
    // Near batter → Yorker
    const yorker = getBowlingLengthFromTarget({ target_x: 0.5, target_y: 0.95 });
    expect(yorker.category).toBe('YORKER');
    expect(yorker.label).toBe('Yorker');

    // Mid pitch → Good Length region for this config
    const good = getBowlingLengthFromTarget({
      target_x: 0.5,
      target_y: targetYFromDistanceFromBatter(6),
    });
    expect(good.category).toBe('GOOD_LENGTH');
    expect(good.distanceFromBatterM).toBeCloseTo(6, 5);

    // Near bowler → Bouncer
    const bouncer = getBowlingLengthFromTarget({ target_x: 0.5, target_y: 0.1 });
    expect(bouncer.category).toBe('BOUNCER');
  });

  it('classifies lateral line with RHB-oriented off/leg labels', () => {
    expect(getLateralLine(0.2).lateralLabel).toBe('Off side');
    expect(getLateralLine(0.5).lateralLabel).toBe('Middle stump');
    expect(getLateralLine(0.8).lateralLabel).toBe('Leg side');
  });

  it('formats distances for player-facing UI', () => {
    expect(formatPitchDistanceM(8.234)).toBe('8.2 m');
  });

  it('keeps zone config as the single source of five categories', () => {
    expect(BOWLING_LENGTH_ZONES.map((z) => z.category)).toEqual([
      'YORKER',
      'FULL',
      'GOOD_LENGTH',
      'SHORT',
      'BOUNCER',
    ]);
  });
});
