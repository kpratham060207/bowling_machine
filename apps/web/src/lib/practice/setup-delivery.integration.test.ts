import { describe, expect, it } from 'vitest';
import { CreateSessionDeliveryInputSchema } from '@bowling-machine/api-contracts';
import {
  DEFAULT_PRACTICE_SETUP,
  setupStateToDeliveryInput,
  validatePracticeSetup,
} from './setup-state';

/**
 * Integration-style test: setup → review payload → shared contract validation.
 * Ensures outgoing requests contain normalized targets and no machine parameters.
 */
describe('practice setup delivery integration', () => {
  it('produces a contract-valid delivery request from configured setup', () => {
    const setup = {
      ...DEFAULT_PRACTICE_SETUP,
      target: { target_x: 0.45, target_y: 0.6 },
      desired_speed_kmh: 85,
      ball_type: 'OUTSWING' as const,
      number_of_balls: 10,
      first_ball_delay_ms: 2000,
      interval_ms: 5000,
    };

    expect(validatePracticeSetup(setup).valid).toBe(true);

    const payload = setupStateToDeliveryInput(setup);
    const parsed = CreateSessionDeliveryInputSchema.parse(payload);

    expect(parsed.target_x).toBe(0.45);
    expect(parsed.target_y).toBe(0.6);
    expect(parsed.desired_speed_kmh).toBe(85);
    expect(parsed.ball_type).toBe('OUTSWING');
    expect(parsed.number_of_balls).toBe(10);
    expect(parsed.first_ball_delay_ms).toBe(2000);
    expect(parsed.interval_ms).toBe(5000);

    const serialized = JSON.stringify(payload);
    expect(serialized).not.toMatch(/rpm|actuator|feeder|trajectory/i);
  });
});
