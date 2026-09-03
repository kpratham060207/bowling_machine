/**
 * Four-actuator platform geometry and pose types.
 *
 * Canonical coordinate frame (right-hand):
 * - +X: right when facing the pitch (batsman)
 * - +Y: toward the pitch (forward)
 * - +Z: upward
 *
 * Corner order (A1–A4) — fixed for all geometry configs:
 * - A1: front-left  (−X, +Y)
 * - A2: front-right (+X, +Y)
 * - A3: rear-left   (−X, −Y)
 * - A4: rear-right  (+X, −Y)
 *
 * Rotation signs (right-hand rule about base axes):
 * - Positive pitch: rotation about +X — raises the +Y (front) side
 * - Positive roll:  rotation about +Y — lowers the +X (right) side (right-hand rule)
 * - Yaw: rotation about +Z — NOT produced by the four vertical actuators
 *
 * Platform DOF controlled by the four actuators: height + pitch + roll.
 * The four lengths are constrained by one rigid-body pose (redundant actuation).
 */

/** 3D point/vector in meters. */
export type Vec3Meters = {
  x: number;
  y: number;
  z: number;
};

/**
 * Desired rigid-platform pose for the four vertical actuators.
 * yaw_rad is always 0 for this mechanism — yaw requires a separate axis.
 */
export type PlatformPose = {
  /** Vertical translation of the platform reference point (meters). */
  height_m: number;
  /** Pitch about +X (radians). */
  pitch_rad: number;
  /** Roll about +Y (radians). */
  roll_rad: number;
};

/**
 * Calibration/configuration geometry for the 4-actuator platform.
 * Real hardware values must be measured — simulation fixtures are labeled.
 */
export type PlatformGeometry = {
  /**
   * When true, joint positions and length limits are SIMULATION ONLY.
   * They must not be treated as measured machine dimensions.
   */
  _simulation: boolean;
  /** Fixed lower mounting points B1–B4 in the base frame (meters). */
  base_joint_positions_m: [Vec3Meters, Vec3Meters, Vec3Meters, Vec3Meters];
  /**
   * Upper ball-joint positions P1–P4 relative to the platform reference frame
   * (meters). Transformed as P'i = R * Pi + T.
   */
  platform_joint_positions_m: [Vec3Meters, Vec3Meters, Vec3Meters, Vec3Meters];
  /** Nominal platform height (meters) used as the level home translation. */
  nominal_height_m: number;
  /** Minimum physical actuator length (meters). */
  minimum_actuator_length_m: number;
  /** Maximum physical actuator length (meters). */
  maximum_actuator_length_m: number;
  /**
   * Max |pitch| when mapping pitch-reference → pose (radians).
   * Simulation mapping only until a calibrated trajectory→pose model exists.
   */
  max_pitch_rad: number;
  /**
   * Max |roll| when mapping pitch-reference → pose (radians).
   * Simulation mapping only until a calibrated trajectory→pose model exists.
   */
  max_roll_rad: number;
};

/** Result of inverse kinematics for one rigid pose. */
export type ActuatorLengthSolution = {
  /** Target lengths L1–L4 in meters (A1–A4 order). */
  lengths_m: [number, number, number, number];
  pose: PlatformPose;
};
