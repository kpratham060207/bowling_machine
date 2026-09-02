import { describe, expect, it } from 'vitest';
import { parseSimulationCalibrationData, StaticCalibrationProvider } from './types.js';
import {
  SIMULATION_CALIBRATION_V1,
  SIMULATION_CALIBRATION_V1_PROFILE,
} from '../fixtures/simulation-calibration-v1.js';

describe('parseSimulationCalibrationData', () => {
  it('parses SIMULATION_CALIBRATION_V1 fixture', () => {
    const parsed = parseSimulationCalibrationData(SIMULATION_CALIBRATION_V1_PROFILE.data);

    expect(parsed).not.toBeNull();
    expect(parsed?._simulation).toBe(true);
    expect(parsed?._label).toBe('SIMULATION_CALIBRATION_V1');
    expect(parsed?.speed_rpm.base_rpm_per_kmh).toBe(10);
  });

  it('returns null when _simulation flag is missing', () => {
    const invalid = { ...SIMULATION_CALIBRATION_V1, _simulation: false };
    expect(
      parseSimulationCalibrationData(invalid as unknown as Record<string, unknown>),
    ).toBeNull();
  });

  it('returns null for malformed calibration data', () => {
    expect(parseSimulationCalibrationData({ _simulation: true })).toBeNull();
    expect(
      parseSimulationCalibrationData({
        _simulation: true,
        speed_rpm: { base_rpm_per_kmh: 'not-a-number' },
        position: { actuator_scale: 1000 },
        feeder: { base_delay_ms: 250 },
        limits: {
          min_wheel_rpm: 200,
          max_wheel_rpm: 3500,
          min_interval_ms: 500,
          max_balls_per_sequence: 24,
        },
      }),
    ).toBeNull();
  });
});

describe('StaticCalibrationProvider', () => {
  it('resolves configured profile', () => {
    const provider = new StaticCalibrationProvider(SIMULATION_CALIBRATION_V1_PROFILE);
    expect(provider.resolve()).toEqual(SIMULATION_CALIBRATION_V1_PROFILE);
  });

  it('returns null when profile is missing', () => {
    const provider = new StaticCalibrationProvider(null);
    expect(provider.resolve()).toBeNull();
  });
});
