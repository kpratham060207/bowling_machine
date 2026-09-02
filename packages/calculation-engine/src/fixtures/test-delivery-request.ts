import type { DeliveryRequest } from '@bowling-machine/api-contracts';

/**
 * Shared valid DeliveryRequest fixture for calculation-engine tests.
 * Values are arbitrary simulation inputs — NOT physically validated.
 */
export const VALID_DELIVERY_REQUEST: DeliveryRequest = {
  target_x: 0.62,
  target_y: 0.73,
  desired_speed_kmh: 120,
  ball_type: 'FAST',
  number_of_balls: 6,
  first_ball_delay_ms: 3000,
  interval_ms: 8000,
};
