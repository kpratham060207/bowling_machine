import { applyMat3, euclideanDistance, platformRotationMatrix } from './rotation.js';
import type {
  ActuatorLengthSolution,
  PlatformGeometry,
  PlatformPose,
  Vec3Meters,
} from './types.js';

export class ActuatorKinematicsError extends Error {
  constructor(
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ActuatorKinematicsError';
  }
}

/**
 * Inverse kinematics for the four vertical linear actuators.
 *
 * For pose (height, pitch, roll) with yaw fixed at 0:
 *   T = (0, 0, height_m)
 *   R = R_yaw · R_pitch · R_roll   (yaw forced to 0 for this mechanism)
 *   P'i = R · Pi + T
 *   Li = ||P'i − Bi||
 *
 * The four lengths are derived from one rigid-body pose — not four independent DOFs.
 * Rejects poses that require any Li outside [min, max] — no silent clipping.
 */
export function solveActuatorLengths(
  geometry: PlatformGeometry,
  pose: PlatformPose,
): ActuatorLengthSolution {
  if (pose.height_m <= 0) {
    throw new ActuatorKinematicsError('Platform height must be positive', {
      height_m: pose.height_m,
    });
  }

  // Four vertical actuators do not command yaw — always identity about Z.
  const rotation = platformRotationMatrix({
    pitch_rad: pose.pitch_rad,
    roll_rad: pose.roll_rad,
    yaw_rad: 0,
  });
  const translation: Vec3Meters = { x: 0, y: 0, z: pose.height_m };

  const lengths_m: [number, number, number, number] = [0, 0, 0, 0];
  const platformJoints = geometry.platform_joint_positions_m;
  const baseJoints = geometry.base_joint_positions_m;

  for (let i = 0; i < 4; i += 1) {
    // Tuple index is always 0..3 in this loop; local aliases satisfy noUncheckedIndexedAccess.
    const platformJoint = platformJoints[i as 0 | 1 | 2 | 3];
    const baseJoint = baseJoints[i as 0 | 1 | 2 | 3];
    const transformed: Vec3Meters = applyMat3(rotation, platformJoint);
    const upper: Vec3Meters = {
      x: transformed.x + translation.x,
      y: transformed.y + translation.y,
      z: transformed.z + translation.z,
    };
    const length = euclideanDistance(upper, baseJoint);
    lengths_m[i as 0 | 1 | 2 | 3] = roundMeters(length);

    if (
      length < geometry.minimum_actuator_length_m ||
      length > geometry.maximum_actuator_length_m
    ) {
      const actuatorLabel = String(i + 1);
      throw new ActuatorKinematicsError(
        `Actuator A${actuatorLabel} required length is outside allowed stroke`,
        {
          actuator_index: i + 1,
          required_length_m: roundMeters(length),
          minimum_actuator_length_m: geometry.minimum_actuator_length_m,
          maximum_actuator_length_m: geometry.maximum_actuator_length_m,
          pose,
        },
      );
    }
  }

  return { lengths_m, pose };
}

function roundMeters(value: number): number {
  // Micrometer resolution is enough for simulation and future hardware.
  return Math.round(value * 1_000_000) / 1_000_000;
}
