import type { Vec3Meters } from './types.js';

/** 3×3 row-major rotation matrix. */
export type Mat3 = [[number, number, number], [number, number, number], [number, number, number]];

/** Rotation about +X (pitch). */
export function rotationX(angleRad: number): Mat3 {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return [
    [1, 0, 0],
    [0, c, -s],
    [0, s, c],
  ];
}

/** Rotation about +Y (roll). */
export function rotationY(angleRad: number): Mat3 {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return [
    [c, 0, s],
    [0, 1, 0],
    [-s, 0, c],
  ];
}

/** Rotation about +Z (yaw) — not used by the four vertical actuators. */
export function rotationZ(angleRad: number): Mat3 {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return [
    [c, -s, 0],
    [s, c, 0],
    [0, 0, 1],
  ];
}

/** Matrix product A·B. */
export function multiplyMat3(a: Mat3, b: Mat3): Mat3 {
  const a0 = a[0];
  const a1 = a[1];
  const a2 = a[2];
  const b0 = b[0];
  const b1 = b[1];
  const b2 = b[2];
  return [
    [
      a0[0] * b0[0] + a0[1] * b1[0] + a0[2] * b2[0],
      a0[0] * b0[1] + a0[1] * b1[1] + a0[2] * b2[1],
      a0[0] * b0[2] + a0[1] * b1[2] + a0[2] * b2[2],
    ],
    [
      a1[0] * b0[0] + a1[1] * b1[0] + a1[2] * b2[0],
      a1[0] * b0[1] + a1[1] * b1[1] + a1[2] * b2[1],
      a1[0] * b0[2] + a1[1] * b1[2] + a1[2] * b2[2],
    ],
    [
      a2[0] * b0[0] + a2[1] * b1[0] + a2[2] * b2[0],
      a2[0] * b0[1] + a2[1] * b1[1] + a2[2] * b2[1],
      a2[0] * b0[2] + a2[1] * b1[2] + a2[2] * b2[2],
    ],
  ];
}

/** Applies R·v for column vector v. */
export function applyMat3(r: Mat3, v: Vec3Meters): Vec3Meters {
  const r0 = r[0];
  const r1 = r[1];
  const r2 = r[2];
  return {
    x: r0[0] * v.x + r0[1] * v.y + r0[2] * v.z,
    y: r1[0] * v.x + r1[1] * v.y + r1[2] * v.z,
    z: r2[0] * v.x + r2[1] * v.y + r2[2] * v.z,
  };
}

/**
 * Platform orientation: R = R_yaw · R_pitch · R_roll (column-vector convention).
 * For the four vertical actuators, yaw is always 0.
 */
export function platformRotationMatrix(pose: {
  pitch_rad: number;
  roll_rad: number;
  yaw_rad?: number;
}): Mat3 {
  const yaw = pose.yaw_rad ?? 0;
  return multiplyMat3(
    multiplyMat3(rotationZ(yaw), rotationX(pose.pitch_rad)),
    rotationY(pose.roll_rad),
  );
}

export function euclideanDistance(a: Vec3Meters, b: Vec3Meters): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
