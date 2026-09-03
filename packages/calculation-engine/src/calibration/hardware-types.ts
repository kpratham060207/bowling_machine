/**
 * Hardware calibration data shape — machine-specific, NOT global constants.
 *
 * Values must come from actual measurements or manufacturer specs.
 * Unknown fields remain null; draft profiles cannot activate on HARDWARE machines.
 */
import { parsePlatformGeometry } from './types.js';
import type { PlatformGeometry } from '../kinematics/types.js';

export type HardwareCalibrationCompleteness = 'draft' | 'validated';

export type HardwareCalibrationData = {
  _hardware: true;
  _completeness: HardwareCalibrationCompleteness;
  _label?: string;
  /** Speed mapping — RPM per km/h; null until measured on hardware. */
  speed_rpm?: {
    base_rpm_per_kmh: number | null;
    max_wheel_differential_rpm: number | null;
  } | null;
  /**
   * Four-actuator platform geometry — measured joint positions and stroke.
   * Must not use simulation placeholder dimensions on HARDWARE machines.
   */
  position?: {
    platform_geometry: PlatformGeometry | null;
  } | null;
  /** Feeder timing — milliseconds. */
  feeder?: {
    base_delay_ms: number | null;
  } | null;
  /** Operational limits — must be measured, not invented. */
  limits?: {
    min_wheel_rpm: number | null;
    max_wheel_rpm: number | null;
    min_interval_ms: number | null;
    max_balls_per_sequence: number | null;
  } | null;
};

/** Fields required before a hardware profile may activate on a HARDWARE machine. */
export const HARDWARE_ACTIVATION_REQUIRED_PATHS = [
  'speed_rpm.base_rpm_per_kmh',
  'speed_rpm.max_wheel_differential_rpm',
  'position.platform_geometry',
  'feeder.base_delay_ms',
  'limits.min_wheel_rpm',
  'limits.max_wheel_rpm',
  'limits.min_interval_ms',
  'limits.max_balls_per_sequence',
] as const;

/**
 * Parses hardware calibration JSON — returns null when _hardware flag is absent.
 * Does NOT validate completeness; use validateCalibrationForActivation for that.
 */
export function parseHardwareCalibrationData(
  data: Record<string, unknown>,
): HardwareCalibrationData | null {
  if (data['_hardware'] !== true) {
    return null;
  }

  const completeness = data['_completeness'];
  if (completeness !== 'draft' && completeness !== 'validated') {
    return null;
  }

  return {
    _hardware: true,
    _completeness: completeness,
    _label: typeof data['_label'] === 'string' ? data['_label'] : undefined,
    speed_rpm: parseSpeedSection(data['speed_rpm']),
    position: parsePositionSection(data['position']),
    feeder: parseFeederSection(data['feeder']),
    limits: parseLimitsSection(data['limits']),
  };
}

function parseSpeedSection(value: unknown): HardwareCalibrationData['speed_rpm'] {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  return {
    base_rpm_per_kmh:
      typeof record['base_rpm_per_kmh'] === 'number' ? record['base_rpm_per_kmh'] : null,
    max_wheel_differential_rpm:
      typeof record['max_wheel_differential_rpm'] === 'number'
        ? record['max_wheel_differential_rpm']
        : null,
  };
}

function parsePositionSection(value: unknown): HardwareCalibrationData['position'] {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  return {
    platform_geometry: parsePlatformGeometry(record['platform_geometry']),
  };
}

function parseFeederSection(value: unknown): HardwareCalibrationData['feeder'] {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  return {
    base_delay_ms: typeof record['base_delay_ms'] === 'number' ? record['base_delay_ms'] : null,
  };
}

function parseLimitsSection(value: unknown): HardwareCalibrationData['limits'] {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  return {
    min_wheel_rpm: typeof record['min_wheel_rpm'] === 'number' ? record['min_wheel_rpm'] : null,
    max_wheel_rpm: typeof record['max_wheel_rpm'] === 'number' ? record['max_wheel_rpm'] : null,
    min_interval_ms:
      typeof record['min_interval_ms'] === 'number' ? record['min_interval_ms'] : null,
    max_balls_per_sequence:
      typeof record['max_balls_per_sequence'] === 'number'
        ? record['max_balls_per_sequence']
        : null,
  };
}

/** Returns missing required field paths for hardware activation. */
export function getMissingHardwareActivationFields(data: HardwareCalibrationData): string[] {
  const missing: string[] = [];

  const checks: Array<[string, unknown]> = [
    ['speed_rpm.base_rpm_per_kmh', data.speed_rpm?.base_rpm_per_kmh ?? null],
    ['speed_rpm.max_wheel_differential_rpm', data.speed_rpm?.max_wheel_differential_rpm ?? null],
    ['position.platform_geometry', data.position?.platform_geometry ?? null],
    ['feeder.base_delay_ms', data.feeder?.base_delay_ms ?? null],
    ['limits.min_wheel_rpm', data.limits?.min_wheel_rpm ?? null],
    ['limits.max_wheel_rpm', data.limits?.max_wheel_rpm ?? null],
    ['limits.min_interval_ms', data.limits?.min_interval_ms ?? null],
    ['limits.max_balls_per_sequence', data.limits?.max_balls_per_sequence ?? null],
  ];

  for (const [path, value] of checks) {
    if (value === null) {
      missing.push(path);
      continue;
    }
    if (path !== 'position.platform_geometry' && typeof value !== 'number') {
      missing.push(path);
    }
  }

  // Hardware must not activate with simulation-only geometry placeholders.
  if (data.position?.platform_geometry?._simulation === true) {
    missing.push('position.platform_geometry (must be measured, not simulation)');
  }

  return missing;
}
