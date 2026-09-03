import { describe, expect, it } from 'vitest';
import type { BallType } from '@bowling-machine/api-contracts';
import { StaticCalibrationProvider } from '../calibration/types.js';
import {
  SIMULATION_CALIBRATION_V1,
  SIMULATION_CALIBRATION_V1_PROFILE,
} from '../fixtures/simulation-calibration-v1.js';
import { VALID_DELIVERY_REQUEST } from '../fixtures/test-delivery-request.js';
import { createDefaultBallTypeRegistry } from '../ball-type/ball-type-registry.js';
import { SimulationPitchCoordinateMapper } from '../pitch-mapper/simulation-pitch-mapper.js';
import {
  createSimulationCalculationEngine,
  DeliveryCalculationEngine,
} from './delivery-calculation-engine.js';

const ALL_BALL_TYPES: BallType[] = [
  'FAST',
  'MEDIUM',
  'SLOW',
  'BOUNCER',
  'YORKER',
  'FULL',
  'INSWING',
  'OUTSWING',
  'LEG_SPIN',
  'OFF_SPIN',
];

describe('DeliveryCalculationEngine — valid inputs', () => {
  const engine = createSimulationCalculationEngine();

  it('calculates successfully for a valid delivery request', () => {
    const result = engine.calculate({ request: VALID_DELIVERY_REQUEST });

    expect(result.success).toBe(true);
    expect(result.request).toEqual(VALID_DELIVERY_REQUEST);
    expect(result.parameters).not.toBeNull();
    expect(result.trajectory?.simulation).toBe(true);
    expect(result.calibration?.profile_id).toBe(SIMULATION_CALIBRATION_V1_PROFILE.profile_id);
    expect(result.calibration?.version).toBe(1);
    expect(result.calibration?.simulation).toBe(true);
  });

  it.each(ALL_BALL_TYPES)('supports ball type %s', (ball_type) => {
    const result = engine.calculate({
      request: { ...VALID_DELIVERY_REQUEST, ball_type },
    });

    expect(result.success).toBe(true);
    expect(result.trajectory?.ball_type).toBe(ball_type);
    expect(result.trajectory?.trajectory_class).toMatch(/^sim_/);
  });

  it('passes through timing and ball count fields', () => {
    const request = {
      ...VALID_DELIVERY_REQUEST,
      number_of_balls: 12,
      first_ball_delay_ms: 1500,
      interval_ms: 6000,
    };
    const result = engine.calculate({ request });

    expect(result.success).toBe(true);
    expect(result.parameters?.ball_count).toBe(12);
    expect(result.parameters?.first_ball_delay_ms).toBe(1500);
    expect(result.parameters?.interval_ms).toBe(6000);
    expect(result.parameters?.feeder_delay_ms).toBe(SIMULATION_CALIBRATION_V1.feeder.base_delay_ms);
  });
});

describe('DeliveryCalculationEngine — determinism', () => {
  const engine = createSimulationCalculationEngine();

  it('produces identical results for identical inputs', () => {
    const first = engine.calculate({ request: VALID_DELIVERY_REQUEST });
    const second = engine.calculate({ request: VALID_DELIVERY_REQUEST });

    expect(first).toEqual(second);
  });

  it('calibration profile changes affect wheel RPM simulation', () => {
    const slowCalibrationProfile = {
      ...SIMULATION_CALIBRATION_V1_PROFILE,
      profile_id: 'simulation-calibration-slow',
      data: {
        ...SIMULATION_CALIBRATION_V1,
        speed_rpm: {
          ...SIMULATION_CALIBRATION_V1.speed_rpm,
          base_rpm_per_kmh: 5,
        },
      } as unknown as Record<string, unknown>,
    };

    const defaultEngine = createSimulationCalculationEngine();
    const slowEngine = new DeliveryCalculationEngine({
      pitchMapper: new SimulationPitchCoordinateMapper(),
      calibrationProvider: new StaticCalibrationProvider(slowCalibrationProfile),
      ballTypeRegistry: createDefaultBallTypeRegistry(),
    });

    const defaultResult = defaultEngine.calculate({ request: VALID_DELIVERY_REQUEST });
    const slowResult = slowEngine.calculate({ request: VALID_DELIVERY_REQUEST });

    expect(defaultResult.parameters?.wheel1_target_rpm).not.toBe(
      slowResult.parameters?.wheel1_target_rpm,
    );
  });
});

describe('DeliveryCalculationEngine — distinguishable simulation outputs', () => {
  const engine = createSimulationCalculationEngine();

  it('different targets produce different actuator simulation values', () => {
    const left = engine.calculate({
      request: { ...VALID_DELIVERY_REQUEST, target_x: 0.2, target_y: 0.3 },
    });
    const right = engine.calculate({
      request: { ...VALID_DELIVERY_REQUEST, target_x: 0.8, target_y: 0.7 },
    });

    expect(left.parameters?.actuator1_target_position).not.toBe(
      right.parameters?.actuator1_target_position,
    );
  });

  it('different speeds produce different wheel RPM simulation values', () => {
    const slow = engine.calculate({
      request: { ...VALID_DELIVERY_REQUEST, desired_speed_kmh: 80 },
    });
    const fast = engine.calculate({
      request: { ...VALID_DELIVERY_REQUEST, desired_speed_kmh: 140 },
    });

    expect(slow.parameters?.wheel1_target_rpm).not.toBe(fast.parameters?.wheel1_target_rpm);
  });

  it('swing ball types apply wheel differential simulation', () => {
    const straight = engine.calculate({
      request: { ...VALID_DELIVERY_REQUEST, ball_type: 'FAST' },
    });
    const inswing = engine.calculate({
      request: { ...VALID_DELIVERY_REQUEST, ball_type: 'INSWING' },
    });

    expect(straight.parameters?.wheel1_target_rpm).not.toBe(inswing.parameters?.wheel1_target_rpm);
    expect(straight.parameters?.wheel2_target_rpm).not.toBe(inswing.parameters?.wheel2_target_rpm);
  });
});

describe('DeliveryCalculationEngine — invalid inputs', () => {
  const engine = createSimulationCalculationEngine();

  it('rejects coordinates outside normalized range', () => {
    const result = engine.calculate({
      request: { ...VALID_DELIVERY_REQUEST, target_x: 1.5 },
    });

    expect(result.success).toBe(false);
    expect(result.errors[0]?.code).toBe('STRUCTURAL_VALIDATION_FAILED');
  });

  it('rejects invalid ball type at structural layer', () => {
    const result = engine.calculate({
      request: { ...VALID_DELIVERY_REQUEST, ball_type: 'GOOGLY' },
    });

    expect(result.success).toBe(false);
    expect(result.errors[0]?.code).toBe('STRUCTURAL_VALIDATION_FAILED');
  });

  it('rejects invalid ball count', () => {
    const result = engine.calculate({
      request: { ...VALID_DELIVERY_REQUEST, number_of_balls: 0 },
    });

    expect(result.success).toBe(false);
    expect(result.errors[0]?.code).toBe('STRUCTURAL_VALIDATION_FAILED');
  });

  it('rejects negative timing values', () => {
    const result = engine.calculate({
      request: { ...VALID_DELIVERY_REQUEST, interval_ms: -1 },
    });

    expect(result.success).toBe(false);
    expect(result.errors[0]?.code).toBe('STRUCTURAL_VALIDATION_FAILED');
  });

  it('rejects malformed request objects', () => {
    const result = engine.calculate({ request: { foo: 'bar' } });

    expect(result.success).toBe(false);
    expect(result.errors[0]?.code).toBe('STRUCTURAL_VALIDATION_FAILED');
  });
});

describe('DeliveryCalculationEngine — calibration', () => {
  it('returns MISSING_CALIBRATION when provider has no profile', () => {
    const engine = new DeliveryCalculationEngine({
      pitchMapper: new SimulationPitchCoordinateMapper(),
      calibrationProvider: new StaticCalibrationProvider(null),
      ballTypeRegistry: createDefaultBallTypeRegistry(),
    });

    const result = engine.calculate({ request: VALID_DELIVERY_REQUEST });

    expect(result.success).toBe(false);
    expect(result.errors[0]?.code).toBe('MISSING_CALIBRATION');
  });

  it('returns INVALID_CALIBRATION for malformed profile data', () => {
    const engine = new DeliveryCalculationEngine({
      pitchMapper: new SimulationPitchCoordinateMapper(),
      calibrationProvider: new StaticCalibrationProvider({
        profile_id: 'bad-profile',
        calibration_type: 'SIMULATION_CALIBRATION',
        version: 1,
        data: { _simulation: true, incomplete: true },
      }),
      ballTypeRegistry: createDefaultBallTypeRegistry(),
    });

    const result = engine.calculate({ request: VALID_DELIVERY_REQUEST });

    expect(result.success).toBe(false);
    expect(result.errors[0]?.code).toBe('INVALID_CALIBRATION');
  });

  it('records calibration profile version on success', () => {
    const engine = createSimulationCalculationEngine();
    const result = engine.calculate({ request: VALID_DELIVERY_REQUEST });

    expect(result.calibration).toEqual({
      profile_id: SIMULATION_CALIBRATION_V1_PROFILE.profile_id,
      calibration_type: 'SIMULATION_CALIBRATION',
      version: 1,
      simulation: true,
    });
  });
});

describe('DeliveryCalculationEngine — validation boundaries', () => {
  const engine = createSimulationCalculationEngine();

  it('fails capability validation when simulated RPM exceeds calibration limits', () => {
    const result = engine.calculate({
      request: { ...VALID_DELIVERY_REQUEST, desired_speed_kmh: 400 },
    });

    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.code === 'UNSUPPORTED_CAPABILITY')).toBe(true);
    expect(result.capability_validation?.valid).toBe(false);
  });

  it('fails capability validation when ball count exceeds simulation max', () => {
    const result = engine.calculate({
      request: { ...VALID_DELIVERY_REQUEST, number_of_balls: 100 },
    });

    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.code === 'UNSUPPORTED_CAPABILITY')).toBe(true);
  });

  it('fails safety validation when interval is below simulation minimum', () => {
    const result = engine.calculate({
      request: { ...VALID_DELIVERY_REQUEST, interval_ms: 100 },
    });

    expect(result.success).toBe(false);
    expect(result.safety_validation?.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'UNSUPPORTED_CAPABILITY')).toBe(true);
  });

  it('preserves original request on failure', () => {
    const request = { ...VALID_DELIVERY_REQUEST, interval_ms: 100 };
    const result = engine.calculate({ request });

    expect(result.request).toEqual(request);
  });
});

describe('DeliveryCalculationEngine — complete simulation example', () => {
  it('documents expected SIMULATION_CALIBRATION_V1 pipeline output', () => {
    const engine = createSimulationCalculationEngine();
    const request = {
      target_x: 0.62,
      target_y: 0.73,
      desired_speed_kmh: 120,
      ball_type: 'FAST' as const,
      number_of_balls: 6,
      first_ball_delay_ms: 3000,
      interval_ms: 8000,
    };

    const result = engine.calculate({ request });

    expect(result.success).toBe(true);
    // SIMULATION ONLY — wheel RPM = speed * base_rpm_per_kmh (10) for FAST (multiplier 1.0)
    expect(result.parameters?.wheel1_target_rpm).toBe(1200);
    expect(result.parameters?.wheel2_target_rpm).toBe(1200);
    // Actuator targets are 3D IK lengths (meters) from SIMULATION ONLY geometry
    expect(result.parameters?.actuator1_target_position).toBeTypeOf('number');
    expect(result.pitch_reference?.reference_y).toBeCloseTo(Math.pow(0.73, 0.85), 5);
  });
});
