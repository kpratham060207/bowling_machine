/**
 * @vitest-environment node
 *
 * Pose-request mapping tests — separate from inverse kinematics.
 * Uses SIMULATION ONLY geometry; not measured machine dimensions.
 */
import { describe, expect, it } from 'vitest';
import { SIMULATION_PLATFORM_GEOMETRY_V1 } from '../fixtures/simulation-platform-geometry-v1.js';
import { poseFromPitchReference } from './pose-from-pitch-reference.js';

const geometry = SIMULATION_PLATFORM_GEOMETRY_V1;

describe('poseFromPitchReference', () => {
  it('maps center reference to level nominal height pose', () => {
    const pose = poseFromPitchReference(geometry, { reference_x: 0.5, reference_y: 0.5 });
    expect(pose.height_m).toBe(geometry.nominal_height_m);
    expect(pose.pitch_rad).toBeCloseTo(0, 10);
    expect(pose.roll_rad).toBeCloseTo(0, 10);
  });

  it('maps reference_y extremes to ±max_pitch_rad', () => {
    const low = poseFromPitchReference(geometry, { reference_x: 0.5, reference_y: 0 });
    const high = poseFromPitchReference(geometry, { reference_x: 0.5, reference_y: 1 });
    expect(low.pitch_rad).toBeCloseTo(-geometry.max_pitch_rad, 10);
    expect(high.pitch_rad).toBeCloseTo(geometry.max_pitch_rad, 10);
  });

  it('maps reference_x extremes to ±max_roll_rad', () => {
    const left = poseFromPitchReference(geometry, { reference_x: 0, reference_y: 0.5 });
    const right = poseFromPitchReference(geometry, { reference_x: 1, reference_y: 0.5 });
    expect(left.roll_rad).toBeCloseTo(-geometry.max_roll_rad, 10);
    expect(right.roll_rad).toBeCloseTo(geometry.max_roll_rad, 10);
  });

  it('does not invent yaw and keeps height at nominal until a height model exists', () => {
    const pose = poseFromPitchReference(geometry, { reference_x: 0.8, reference_y: 0.2 });
    expect(pose).toEqual({
      height_m: geometry.nominal_height_m,
      pitch_rad: pose.pitch_rad,
      roll_rad: pose.roll_rad,
    });
    expect(Object.keys(pose)).toEqual(['height_m', 'pitch_rad', 'roll_rad']);
  });
});
