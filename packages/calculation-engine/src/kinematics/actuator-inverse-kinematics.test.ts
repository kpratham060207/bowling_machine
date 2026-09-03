/**
 * @vitest-environment node
 *
 * Deterministic geometric proofs for the four-actuator inverse kinematics.
 * Uses SIMULATION ONLY geometry — not physical machine measurements.
 */
import { describe, expect, it } from 'vitest';
import { ActuatorKinematicsError, solveActuatorLengths } from './actuator-inverse-kinematics.js';
import { SIMULATION_PLATFORM_GEOMETRY_V1 } from '../fixtures/simulation-platform-geometry-v1.js';
import type { PlatformGeometry } from './types.js';

const geometry: PlatformGeometry = SIMULATION_PLATFORM_GEOMETRY_V1;

describe('solveActuatorLengths — level platform', () => {
  it('produces equal lengths for pitch=0, roll=0 on symmetric geometry', () => {
    const { lengths_m } = solveActuatorLengths(geometry, {
      height_m: geometry.nominal_height_m,
      pitch_rad: 0,
      roll_rad: 0,
    });

    expect(lengths_m[0]).toBeCloseTo(geometry.nominal_height_m, 6);
    expect(lengths_m[1]).toBeCloseTo(lengths_m[0], 6);
    expect(lengths_m[2]).toBeCloseTo(lengths_m[0], 6);
    expect(lengths_m[3]).toBeCloseTo(lengths_m[0], 6);
  });
});

describe('solveActuatorLengths — pure height change', () => {
  it('changes all four lengths consistently when only height changes', () => {
    const low = solveActuatorLengths(geometry, {
      height_m: 0.35,
      pitch_rad: 0,
      roll_rad: 0,
    });
    const high = solveActuatorLengths(geometry, {
      height_m: 0.45,
      pitch_rad: 0,
      roll_rad: 0,
    });

    for (let i = 0; i < 4; i += 1) {
      expect(high.lengths_m[i]).toBeGreaterThan(low.lengths_m[i]);
      expect(high.lengths_m[i] - low.lengths_m[i]).toBeCloseTo(0.1, 6);
    }
  });
});

describe('solveActuatorLengths — pure pitch', () => {
  it('extends front actuators and shortens rear actuators for positive pitch', () => {
    const { lengths_m } = solveActuatorLengths(geometry, {
      height_m: geometry.nominal_height_m,
      pitch_rad: 0.08,
      roll_rad: 0,
    });

    // A1/A2 front (+Y); A3/A4 rear (−Y)
    expect(lengths_m[0]).toBeGreaterThan(lengths_m[2]);
    expect(lengths_m[1]).toBeGreaterThan(lengths_m[3]);
    expect(lengths_m[0]).toBeCloseTo(lengths_m[1], 6);
    expect(lengths_m[2]).toBeCloseTo(lengths_m[3], 6);
  });
});

describe('solveActuatorLengths — pure roll', () => {
  it('extends left actuators and shortens right actuators for positive roll', () => {
    const { lengths_m } = solveActuatorLengths(geometry, {
      height_m: geometry.nominal_height_m,
      pitch_rad: 0,
      roll_rad: 0.08,
    });

    // Positive roll about +Y lowers +X (right): A1/A3 left longer than A2/A4 right
    expect(lengths_m[0]).toBeGreaterThan(lengths_m[1]);
    expect(lengths_m[2]).toBeGreaterThan(lengths_m[3]);
    expect(lengths_m[0]).toBeCloseTo(lengths_m[2], 6);
    expect(lengths_m[1]).toBeCloseTo(lengths_m[3], 6);
  });
});

describe('solveActuatorLengths — combined pitch + roll', () => {
  it('produces four distinct lengths where geometry requires it', () => {
    const { lengths_m } = solveActuatorLengths(geometry, {
      height_m: geometry.nominal_height_m,
      pitch_rad: 0.07,
      roll_rad: 0.06,
    });

    const unique = new Set(lengths_m.map((l) => l.toFixed(6)));
    expect(unique.size).toBe(4);
  });
});

describe('solveActuatorLengths — unreachable pose', () => {
  it('rejects when an actuator exceeds its allowed stroke', () => {
    expect(() =>
      solveActuatorLengths(geometry, {
        height_m: geometry.maximum_actuator_length_m + 0.05,
        pitch_rad: 0,
        roll_rad: 0,
      }),
    ).toThrow(ActuatorKinematicsError);
  });
});

describe('solveActuatorLengths — symmetry', () => {
  it('mirrors left/right lengths for opposite roll', () => {
    const positive = solveActuatorLengths(geometry, {
      height_m: geometry.nominal_height_m,
      pitch_rad: 0,
      roll_rad: 0.07,
    });
    const negative = solveActuatorLengths(geometry, {
      height_m: geometry.nominal_height_m,
      pitch_rad: 0,
      roll_rad: -0.07,
    });

    expect(positive.lengths_m[0]).toBeCloseTo(negative.lengths_m[1], 6);
    expect(positive.lengths_m[1]).toBeCloseTo(negative.lengths_m[0], 6);
    expect(positive.lengths_m[2]).toBeCloseTo(negative.lengths_m[3], 6);
    expect(positive.lengths_m[3]).toBeCloseTo(negative.lengths_m[2], 6);
  });
});

describe('solveActuatorLengths — no yaw by accident', () => {
  it('does not expose yaw as an independent actuator degree of freedom', () => {
    // Pose type has no yaw field; rotation always forces yaw = 0.
    const solution = solveActuatorLengths(geometry, {
      height_m: geometry.nominal_height_m,
      pitch_rad: 0.05,
      roll_rad: 0.04,
    });

    expect(Object.keys(solution.pose)).toEqual(['height_m', 'pitch_rad', 'roll_rad']);
    expect(solution.lengths_m).toHaveLength(4);
  });
});
