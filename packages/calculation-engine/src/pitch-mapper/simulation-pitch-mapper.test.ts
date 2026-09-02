import { describe, expect, it } from 'vitest';
import { SimulationPitchCoordinateMapper } from './simulation-pitch-mapper.js';

describe('SimulationPitchCoordinateMapper', () => {
  const mapper = new SimulationPitchCoordinateMapper();

  it('maps center coordinate deterministically', () => {
    const first = mapper.map({ target_x: 0.5, target_y: 0.5 });
    const second = mapper.map({ target_x: 0.5, target_y: 0.5 });

    expect(first).toEqual(second);
    expect(first.reference_x).toBe(0.5);
    expect(first.simulation).toBe(true);
  });

  it('clamps boundary coordinates without throwing', () => {
    const min = mapper.map({ target_x: -0.2, target_y: -0.1 });
    const max = mapper.map({ target_x: 1.5, target_y: 2 });

    expect(min.reference_x).toBe(0);
    expect(min.reference_y).toBe(0);
    expect(max.reference_x).toBe(1);
    expect(max.reference_y).toBe(1);
  });

  it('applies perspective-aware length correction (non-linear target_y)', () => {
    const linearY = 0.64;
    const mapped = mapper.map({ target_x: 0.5, target_y: linearY });

    // Exponent 0.85 compresses y — mapped reference_y differs from raw target_y.
    expect(mapped.reference_y).not.toBe(linearY);
    expect(mapped.reference_y).toBeCloseTo(Math.pow(linearY, 0.85), 5);
  });

  it('produces distinguishable results for different targets', () => {
    const left = mapper.map({ target_x: 0.2, target_y: 0.3 });
    const right = mapper.map({ target_x: 0.8, target_y: 0.3 });

    expect(left.reference_x).not.toBe(right.reference_x);
  });

  it('does not depend on viewport or DOM concepts', () => {
    // Mapper API accepts only normalized pitch targets — no UI fields.
    const result = mapper.map({ target_x: 0.62, target_y: 0.73 });
    expect(result).not.toHaveProperty('ui_x');
    expect(result).not.toHaveProperty('viewport');
  });
});
