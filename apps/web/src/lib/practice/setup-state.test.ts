import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PRACTICE_SETUP,
  setupStateToDeliveryInput,
  validatePracticeSetup,
} from './setup-state';

describe('practice setup validation', () => {
  it('requires a pitch target before start', () => {
    const result = validatePracticeSetup(DEFAULT_PRACTICE_SETUP);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/target/i);
  });

  it('accepts a complete valid setup', () => {
    const result = validatePracticeSetup({
      ...DEFAULT_PRACTICE_SETUP,
      target: { target_x: 0.5, target_y: 0.5 },
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects zero ball count and invalid speed', () => {
    const result = validatePracticeSetup({
      ...DEFAULT_PRACTICE_SETUP,
      target: { target_x: 0.5, target_y: 0.5 },
      number_of_balls: 0,
      desired_speed_kmh: 0,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });

  it('builds delivery input with high-level fields only', () => {
    const state = {
      ...DEFAULT_PRACTICE_SETUP,
      target: { target_x: 0.62, target_y: 0.73 },
    };
    const payload = setupStateToDeliveryInput(state);

    expect(payload).toEqual({
      target_x: 0.62,
      target_y: 0.73,
      desired_speed_kmh: 120,
      ball_type: 'FAST',
      number_of_balls: 6,
      first_ball_delay_ms: 3000,
      interval_ms: 8000,
    });

    expect(payload).not.toHaveProperty('wheel');
    expect(payload).not.toHaveProperty('rpm');
    expect(payload).not.toHaveProperty('actuator');
  });
});
