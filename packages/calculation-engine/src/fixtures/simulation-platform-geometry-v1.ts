/**
 * SIMULATION ONLY platform geometry fixture.
 *
 * These dimensions are NOT measured on a physical bowling machine.
 * They exist so inverse-kinematics math and tests are deterministic until
 * real corner mounts, stroke, and ball-joint offsets are calibrated.
 */
import type { PlatformGeometry } from '../kinematics/types.js';

/** Half-width / half-length of the simulation mounting rectangle (meters). */
const HALF_X_M = 0.2;
const HALF_Y_M = 0.25;

/**
 * Symmetric rectangular geometry — SIMULATION ONLY.
 * Base and platform joints share the same XY footprint so a level pose
 * yields identical actuator lengths equal to height.
 */
export const SIMULATION_PLATFORM_GEOMETRY_V1: PlatformGeometry = {
  _simulation: true,
  base_joint_positions_m: [
    { x: -HALF_X_M, y: HALF_Y_M, z: 0 }, // A1 front-left
    { x: HALF_X_M, y: HALF_Y_M, z: 0 }, // A2 front-right
    { x: -HALF_X_M, y: -HALF_Y_M, z: 0 }, // A3 rear-left
    { x: HALF_X_M, y: -HALF_Y_M, z: 0 }, // A4 rear-right
  ],
  platform_joint_positions_m: [
    { x: -HALF_X_M, y: HALF_Y_M, z: 0 },
    { x: HALF_X_M, y: HALF_Y_M, z: 0 },
    { x: -HALF_X_M, y: -HALF_Y_M, z: 0 },
    { x: HALF_X_M, y: -HALF_Y_M, z: 0 },
  ],
  nominal_height_m: 0.4,
  minimum_actuator_length_m: 0.28,
  maximum_actuator_length_m: 0.55,
  max_pitch_rad: 0.12,
  max_roll_rad: 0.1,
};
