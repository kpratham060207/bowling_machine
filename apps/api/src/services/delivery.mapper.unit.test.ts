import { describe, expect, it } from 'vitest';
import { mapParametersToCalculatedJson } from './delivery.mapper.js';

describe('delivery.mapper', () => {
  it('preserves calculated parameter fields in JSON snapshot', () => {
    const snapshot = mapParametersToCalculatedJson({
      wheel1_target_rpm: 1200,
      wheel2_target_rpm: 1180,
      actuator1_target_position: 10,
      actuator2_target_position: 20,
      actuator3_target_position: 30,
      actuator4_target_position: 40,
      feeder_delay_ms: 250,
      ball_count: 3,
      first_ball_delay_ms: 1000,
      interval_ms: 2000,
    });

    expect(snapshot.ball_count).toBe(3);
    expect(snapshot.wheel1_target_rpm).toBe(1200);
    expect(snapshot.interval_ms).toBe(2000);
  });
});
