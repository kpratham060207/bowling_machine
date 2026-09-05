/**
 * @vitest-environment node
 *
 * Rotation convention proofs for the platform orientation matrix.
 */
import { describe, expect, it } from 'vitest';
import { applyMat3, platformRotationMatrix } from './rotation.js';

describe('platformRotationMatrix', () => {
  it('is identity when pitch, roll, and yaw are zero', () => {
    const r = platformRotationMatrix({ pitch_rad: 0, roll_rad: 0, yaw_rad: 0 });
    expect(r[0]).toEqual([1, 0, 0]);
    expect(r[1]).toEqual([0, 1, 0]);
    expect(r[2]).toEqual([0, 0, 1]);
  });

  it('defaults missing yaw to 0 so vertical actuators never invent yaw', () => {
    const withDefault = platformRotationMatrix({ pitch_rad: 0.1, roll_rad: -0.05 });
    const explicitZero = platformRotationMatrix({
      pitch_rad: 0.1,
      roll_rad: -0.05,
      yaw_rad: 0,
    });
    expect(withDefault).toEqual(explicitZero);
  });

  it('positive pitch raises a front (+Y) point', () => {
    const r = platformRotationMatrix({ pitch_rad: 0.2, roll_rad: 0, yaw_rad: 0 });
    const front = applyMat3(r, { x: 0, y: 1, z: 0 });
    expect(front.z).toBeGreaterThan(0);
  });

  it('positive roll lowers a right (+X) point', () => {
    const r = platformRotationMatrix({ pitch_rad: 0, roll_rad: 0.2, yaw_rad: 0 });
    const right = applyMat3(r, { x: 1, y: 0, z: 0 });
    expect(right.z).toBeLessThan(0);
  });

  it('non-zero yaw rotates about +Z and must stay a separate mechanism', () => {
    const withYaw = platformRotationMatrix({ pitch_rad: 0, roll_rad: 0, yaw_rad: 0.3 });
    const point = applyMat3(withYaw, { x: 1, y: 0, z: 0 });
    // Pure yaw keeps Z unchanged and rotates XY — not an actuator stroke DOF.
    expect(point.z).toBeCloseTo(0, 10);
    expect(point.y).toBeGreaterThan(0);
    expect(point.x).toBeLessThan(1);
  });
});
