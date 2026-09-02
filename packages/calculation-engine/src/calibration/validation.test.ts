import { describe, expect, it } from 'vitest';
import { validateCalibrationForActivation } from './validation.js';
import { SIMULATION_CALIBRATION_V1_PROFILE } from '../fixtures/simulation-calibration-v1.js';

describe('validateCalibrationForActivation', () => {
  it('allows simulation calibration on SIMULATOR machines', () => {
    const result = validateCalibrationForActivation(
      SIMULATION_CALIBRATION_V1_PROFILE.data,
      'SIMULATOR',
    );
    expect(result.valid).toBe(true);
    expect(result.is_simulation).toBe(true);
  });

  it('rejects simulation calibration on HARDWARE machines', () => {
    const result = validateCalibrationForActivation(
      SIMULATION_CALIBRATION_V1_PROFILE.data,
      'HARDWARE',
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Simulation calibration');
  });

  it('rejects draft hardware calibration', () => {
    const result = validateCalibrationForActivation(
      {
        _hardware: true,
        _completeness: 'draft',
        speed_rpm: { base_rpm_per_kmh: null, max_wheel_differential_rpm: null },
      },
      'HARDWARE',
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('draft');
  });

  it('accepts validated hardware calibration with all required fields', () => {
    const result = validateCalibrationForActivation(
      {
        _hardware: true,
        _completeness: 'validated',
        speed_rpm: { base_rpm_per_kmh: 10, max_wheel_differential_rpm: 200 },
        position: { actuator_scale: 1000 },
        feeder: { base_delay_ms: 250 },
        limits: {
          min_wheel_rpm: 200,
          max_wheel_rpm: 3500,
          min_interval_ms: 500,
          max_balls_per_sequence: 24,
        },
      },
      'HARDWARE',
    );
    expect(result.valid).toBe(true);
    expect(result.is_hardware).toBe(true);
  });

  it('rejects validated hardware calibration with missing measured fields', () => {
    const result = validateCalibrationForActivation(
      {
        _hardware: true,
        _completeness: 'validated',
        speed_rpm: { base_rpm_per_kmh: 10, max_wheel_differential_rpm: null },
      },
      'HARDWARE',
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('max_wheel_differential_rpm'))).toBe(true);
  });
});
