import type { PlatformGeometry, PlatformPose } from './types.js';

/**
 * Maps pitch-reference coordinates to a rigid platform pose.
 *
 * This is a calibration-driven *pose request* layer — separate from IK.
 * Speed / wheel RPM must not be mixed into this mapping.
 *
 * Convention:
 * - reference_x = 0.5 → roll = 0; 0 → −max_roll; 1 → +max_roll
 * - reference_y = 0.5 → pitch = 0; 0 → −max_pitch; 1 → +max_pitch
 * - height stays at nominal_height_m until a calibrated height model exists
 */
export function poseFromPitchReference(
  geometry: PlatformGeometry,
  pitchReference: { reference_x: number; reference_y: number },
): PlatformPose {
  const roll_rad = (clamp01(pitchReference.reference_x) - 0.5) * 2 * geometry.max_roll_rad;
  const pitch_rad = (clamp01(pitchReference.reference_y) - 0.5) * 2 * geometry.max_pitch_rad;

  return {
    height_m: geometry.nominal_height_m,
    pitch_rad,
    roll_rad,
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
