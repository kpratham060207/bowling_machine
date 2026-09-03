/**
 * SIMULATION_CALIBRATION_V1 — explicit test/production-simulation fixture.
 *
 * All numeric values are SIMULATION ONLY — NOT physically validated.
 * Platform geometry is a placeholder for kinematics tests until real mounts
 * and strokes are measured.
 */
import type { SimulationCalibrationData } from '../calibration/types.js';
import { SIMULATION_PLATFORM_GEOMETRY_V1 } from './simulation-platform-geometry-v1.js';

export const SIMULATION_CALIBRATION_V1: SimulationCalibrationData = {
  _simulation: true,
  _label: 'SIMULATION_CALIBRATION_V1',
  speed_rpm: {
    base_rpm_per_kmh: 10,
    max_wheel_differential_rpm: 120,
  },
  position: {
    platform_geometry: SIMULATION_PLATFORM_GEOMETRY_V1,
  },
  feeder: {
    base_delay_ms: 250,
  },
  limits: {
    min_wheel_rpm: 200,
    max_wheel_rpm: 3500,
    min_interval_ms: 500,
    max_balls_per_sequence: 24,
  },
};

/** Calibration profile wrapper for SIMULATION_CALIBRATION_V1 fixture. */
export const SIMULATION_CALIBRATION_V1_PROFILE = {
  profile_id: 'simulation-calibration-v1-fixture',
  calibration_type: 'SIMULATION_CALIBRATION' as const,
  version: 1,
  data: SIMULATION_CALIBRATION_V1 as unknown as Record<string, unknown>,
};
