/**
 * SIMULATION_CALIBRATION data shape — deterministic MVP mappings.
 * Clearly labelled simulation; NOT experimentally calibrated physical data.
 */
import type { PlatformGeometry } from '../kinematics/types.js';

export type SimulationCalibrationData = {
  _simulation: true;
  _label: 'SIMULATION_CALIBRATION_V1';
  speed_rpm: {
    /** Simulated RPM per km/h — NOT measured on hardware. */
    base_rpm_per_kmh: number;
    /** Max wheel differential magnitude for swing/spin simulation. */
    max_wheel_differential_rpm: number;
  };
  position: {
    /**
     * Four-actuator platform geometry for inverse kinematics.
     * When `_simulation: true`, joint positions are NOT measured hardware values.
     */
    platform_geometry: PlatformGeometry;
  };
  feeder: {
    /** Base feeder delay after wheels at speed — milliseconds (simulation). */
    base_delay_ms: number;
  };
  limits: {
    /** Simulation-only RPM bounds for capability validation — NOT physical limits. */
    min_wheel_rpm: number;
    max_wheel_rpm: number;
    min_interval_ms: number;
    max_balls_per_sequence: number;
  };
};

/** Injected calibration profile — backend loads from DB and passes to engine. */
export type CalibrationProfile = {
  profile_id: string;
  calibration_type: string;
  version: number;
  data: Record<string, unknown>;
};

/**
 * Provides calibration data to the engine without DB coupling.
 * Backend adapters load from calibration_profiles table and call resolve().
 */
export interface CalibrationProvider {
  resolve(machineId?: string): CalibrationProfile | null;
}

/** Static in-memory provider for tests and simulation. */
export class StaticCalibrationProvider implements CalibrationProvider {
  constructor(private readonly profile: CalibrationProfile | null) {}

  resolve(): CalibrationProfile | null {
    return this.profile;
  }
}

/** Parses and validates simulation calibration JSON — returns null if invalid. */
export function parseSimulationCalibrationData(
  data: Record<string, unknown>,
): SimulationCalibrationData | null {
  if (data['_simulation'] !== true) {
    return null;
  }

  const speed = data['speed_rpm'];
  const position = data['position'];
  const feeder = data['feeder'];
  const limits = data['limits'];

  if (
    typeof speed !== 'object' ||
    speed === null ||
    typeof position !== 'object' ||
    position === null ||
    typeof feeder !== 'object' ||
    feeder === null ||
    typeof limits !== 'object' ||
    limits === null
  ) {
    return null;
  }

  const speedRecord = speed as Record<string, unknown>;
  const positionRecord = position as Record<string, unknown>;
  const feederRecord = feeder as Record<string, unknown>;
  const limitsRecord = limits as Record<string, unknown>;

  const baseRpmPerKmh = speedRecord['base_rpm_per_kmh'];
  const maxDiff = speedRecord['max_wheel_differential_rpm'];
  const platformGeometry = parsePlatformGeometry(positionRecord['platform_geometry']);
  const baseDelay = feederRecord['base_delay_ms'];
  const minRpm = limitsRecord['min_wheel_rpm'];
  const maxRpm = limitsRecord['max_wheel_rpm'];
  const minInterval = limitsRecord['min_interval_ms'];
  const maxBalls = limitsRecord['max_balls_per_sequence'];

  if (
    typeof baseRpmPerKmh !== 'number' ||
    typeof maxDiff !== 'number' ||
    platformGeometry === null ||
    typeof baseDelay !== 'number' ||
    typeof minRpm !== 'number' ||
    typeof maxRpm !== 'number' ||
    typeof minInterval !== 'number' ||
    typeof maxBalls !== 'number'
  ) {
    return null;
  }

  return {
    _simulation: true,
    _label: 'SIMULATION_CALIBRATION_V1',
    speed_rpm: {
      base_rpm_per_kmh: baseRpmPerKmh,
      max_wheel_differential_rpm: maxDiff,
    },
    position: { platform_geometry: platformGeometry },
    feeder: { base_delay_ms: baseDelay },
    limits: {
      min_wheel_rpm: minRpm,
      max_wheel_rpm: maxRpm,
      min_interval_ms: minInterval,
      max_balls_per_sequence: maxBalls,
    },
  };
}

/** Parses platform geometry from calibration JSON — null when incomplete. */
export function parsePlatformGeometry(value: unknown): PlatformGeometry | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const baseJoints = parseJointArray(record['base_joint_positions_m']);
  const platformJoints = parseJointArray(record['platform_joint_positions_m']);
  const nominalHeight = record['nominal_height_m'];
  const minLength = record['minimum_actuator_length_m'];
  const maxLength = record['maximum_actuator_length_m'];
  const maxPitch = record['max_pitch_rad'];
  const maxRoll = record['max_roll_rad'];
  const simulation = record['_simulation'];

  if (
    baseJoints === null ||
    platformJoints === null ||
    typeof nominalHeight !== 'number' ||
    typeof minLength !== 'number' ||
    typeof maxLength !== 'number' ||
    typeof maxPitch !== 'number' ||
    typeof maxRoll !== 'number' ||
    typeof simulation !== 'boolean'
  ) {
    return null;
  }

  return {
    _simulation: simulation,
    base_joint_positions_m: baseJoints,
    platform_joint_positions_m: platformJoints,
    nominal_height_m: nominalHeight,
    minimum_actuator_length_m: minLength,
    maximum_actuator_length_m: maxLength,
    max_pitch_rad: maxPitch,
    max_roll_rad: maxRoll,
  };
}

function parseJointArray(value: unknown): PlatformGeometry['base_joint_positions_m'] | null {
  if (!Array.isArray(value) || value.length !== 4) {
    return null;
  }

  const joints: PlatformGeometry['base_joint_positions_m'] = [
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 },
  ];

  for (let i = 0; i < 4; i += 1) {
    const jointUnknown: unknown = value[i];
    if (typeof jointUnknown !== 'object' || jointUnknown === null) {
      return null;
    }
    const record = jointUnknown as Record<string, unknown>;
    const x = record['x'];
    const y = record['y'];
    const z = record['z'];
    if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
      return null;
    }
    joints[i as 0 | 1 | 2 | 3] = { x, y, z };
  }

  return joints;
}
