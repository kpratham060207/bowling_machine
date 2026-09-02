import {
  parseHardwareCalibrationData,
  getMissingHardwareActivationFields,
} from './hardware-types.js';
import { parseSimulationCalibrationData, type SimulationCalibrationData } from './types.js';

export type CalibrationKind = 'simulation' | 'hardware' | 'unknown';

export type CalibrationValidationResult = {
  kind: CalibrationKind;
  valid: boolean;
  errors: string[];
  is_simulation: boolean;
  is_hardware: boolean;
  hardware_completeness: 'draft' | 'validated' | null;
};

/**
 * Validates calibration data before profile activation.
 * Does NOT invent default values — incomplete hardware data fails validation.
 */
export function validateCalibrationForActivation(
  data: Record<string, unknown>,
  machineKind: 'SIMULATOR' | 'HARDWARE',
): CalibrationValidationResult {
  const simulation = parseSimulationCalibrationData(data);
  if (simulation) {
    if (machineKind === 'HARDWARE') {
      return {
        kind: 'simulation',
        valid: false,
        errors: ['Simulation calibration cannot activate on a HARDWARE machine'],
        is_simulation: true,
        is_hardware: false,
        hardware_completeness: null,
      };
    }
    return {
      kind: 'simulation',
      valid: true,
      errors: [],
      is_simulation: true,
      is_hardware: false,
      hardware_completeness: null,
    };
  }

  const hardware = parseHardwareCalibrationData(data);
  if (hardware) {
    if (hardware._completeness === 'draft') {
      return {
        kind: 'hardware',
        valid: false,
        errors: [
          'Hardware calibration profile is draft — mark _completeness as validated after measurement',
        ],
        is_simulation: false,
        is_hardware: true,
        hardware_completeness: 'draft',
      };
    }

    const missing = getMissingHardwareActivationFields(hardware);
    if (missing.length > 0) {
      return {
        kind: 'hardware',
        valid: false,
        errors: missing.map((path) => `Missing required hardware calibration field: ${path}`),
        is_simulation: false,
        is_hardware: true,
        hardware_completeness: 'validated',
      };
    }

    return {
      kind: 'hardware',
      valid: true,
      errors: [],
      is_simulation: false,
      is_hardware: true,
      hardware_completeness: 'validated',
    };
  }

  return {
    kind: 'unknown',
    valid: false,
    errors: [
      'Calibration data must be simulation (_simulation: true) or hardware (_hardware: true with _completeness)',
    ],
    is_simulation: false,
    is_hardware: false,
    hardware_completeness: null,
  };
}

/** Converts validated hardware calibration into engine-compatible numeric data. */
export function resolveEngineCalibrationData(
  data: Record<string, unknown>,
): SimulationCalibrationData | null {
  const simulation = parseSimulationCalibrationData(data);
  if (simulation) {
    return simulation;
  }

  const hardware = parseHardwareCalibrationData(data);
  if (!hardware || hardware._completeness !== 'validated') {
    return null;
  }
  if (getMissingHardwareActivationFields(hardware).length > 0) {
    return null;
  }

  const speed = hardware.speed_rpm;
  const position = hardware.position;
  const feeder = hardware.feeder;
  const limits = hardware.limits;
  if (
    !speed ||
    speed.base_rpm_per_kmh === null ||
    speed.max_wheel_differential_rpm === null ||
    !position ||
    position.actuator_scale === null ||
    !feeder ||
    feeder.base_delay_ms === null ||
    !limits ||
    limits.min_wheel_rpm === null ||
    limits.max_wheel_rpm === null ||
    limits.min_interval_ms === null ||
    limits.max_balls_per_sequence === null
  ) {
    return null;
  }

  return {
    _simulation: true,
    _label: 'SIMULATION_CALIBRATION_V1',
    speed_rpm: {
      base_rpm_per_kmh: speed.base_rpm_per_kmh,
      max_wheel_differential_rpm: speed.max_wheel_differential_rpm,
    },
    position: { actuator_scale: position.actuator_scale },
    feeder: { base_delay_ms: feeder.base_delay_ms },
    limits: {
      min_wheel_rpm: limits.min_wheel_rpm,
      max_wheel_rpm: limits.max_wheel_rpm,
      min_interval_ms: limits.min_interval_ms,
      max_balls_per_sequence: limits.max_balls_per_sequence,
    },
  };
}
