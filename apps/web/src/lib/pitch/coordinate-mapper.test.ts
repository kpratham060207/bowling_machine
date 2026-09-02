/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';
import { normalizedToViewBox, viewBoxToNormalized } from './coordinate-mapper';
import { DEFAULT_PITCH_LAYOUT, PITCH_VIEWBOX } from './pitch-layout';

describe('pitch coordinate mapper', () => {
  it('maps center normalized point to viewBox inside pitch bounds', () => {
    const center = normalizedToViewBox({ target_x: 0.5, target_y: 0.5 });
    expect(center.vx).toBeGreaterThan(DEFAULT_PITCH_LAYOUT.bottomLeftX);
    expect(center.vx).toBeLessThan(DEFAULT_PITCH_LAYOUT.bottomRightX);
    expect(center.vy).toBeGreaterThan(DEFAULT_PITCH_LAYOUT.topY);
    expect(center.vy).toBeLessThan(DEFAULT_PITCH_LAYOUT.bottomY);
  });

  it('round-trips normalized coordinates deterministically', () => {
    const original = { target_x: 0.62, target_y: 0.73 };
    const view = normalizedToViewBox(original);
    const mapped = viewBoxToNormalized(view.vx, view.vy);
    expect(mapped).not.toBeNull();
    expect(mapped?.target_x).toBeCloseTo(original.target_x, 5);
    expect(mapped?.target_y).toBeCloseTo(original.target_y, 5);
  });

  it('clamps corner selections to pitch edges', () => {
    const bowlerLeft = viewBoxToNormalized(
      DEFAULT_PITCH_LAYOUT.bottomLeftX,
      DEFAULT_PITCH_LAYOUT.bottomY,
    );
    expect(bowlerLeft).toEqual({ target_x: 0, target_y: 0 });

    const batterRight = viewBoxToNormalized(
      DEFAULT_PITCH_LAYOUT.topRightX,
      DEFAULT_PITCH_LAYOUT.topY,
    );
    expect(batterRight?.target_x).toBeCloseTo(1, 5);
    expect(batterRight?.target_y).toBeCloseTo(1, 5);
  });

  it('returns null for points outside the pitch trapezoid', () => {
    expect(viewBoxToNormalized(0, 0)).toBeNull();
    expect(viewBoxToNormalized(50, 200)).toBeNull();
    expect(viewBoxToNormalized(5, 80)).toBeNull();
  });

  it('keeps equivalent logical coordinates stable across responsive viewBox scaling', () => {
    const logical = { target_x: 0.4, target_y: 0.55 };
    const atDefault = normalizedToViewBox(logical);

    // Simulated narrower/wider render uses the same viewBox — normalized output must match.
    const remapped = viewBoxToNormalized(atDefault.vx, atDefault.vy);
    expect(remapped).not.toBeNull();
    expect(remapped?.target_x).toBeCloseTo(logical.target_x, 5);
    expect(remapped?.target_y).toBeCloseTo(logical.target_y, 5);
  });

  it('maps portrait and desktop viewBox dimensions identically (fixed viewBox contract)', () => {
    const targets = [
      { target_x: 0.2, target_y: 0.3 },
      { target_x: 0.8, target_y: 0.9 },
      { target_x: 0.5, target_y: 0.5 },
    ];

    for (const target of targets) {
      const view = normalizedToViewBox(target);
      const back = viewBoxToNormalized(view.vx, view.vy);
      expect(back).not.toBeNull();
      expect(back?.target_x).toBeCloseTo(target.target_x, 5);
      expect(back?.target_y).toBeCloseTo(target.target_y, 5);
    }

    expect(PITCH_VIEWBOX.width).toBe(100);
    expect(PITCH_VIEWBOX.height).toBe(160);
  });
});
