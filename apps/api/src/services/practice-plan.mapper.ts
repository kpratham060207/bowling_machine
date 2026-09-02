import type {
  CreateSessionDeliveryInput,
  PracticePlanDelivery,
} from '@bowling-machine/api-contracts';
import type { PracticePlanDelivery as PlanDeliveryRow } from '@bowling-machine/database';

/** Maps plan delivery rows to API contract shape with sequence numbers. */
export function mapPlanDeliveryRowToContract(row: PlanDeliveryRow): PracticePlanDelivery {
  return {
    sequence_number: row.sequenceNumber,
    target_x: Number(row.targetX),
    target_y: Number(row.targetY),
    desired_speed_kmh: Number(row.desiredSpeedKmh),
    ball_type: row.ballType,
    number_of_balls: row.numberOfBalls,
    first_ball_delay_ms: row.firstBallDelayMs,
    interval_ms: row.intervalMs,
  };
}

/** Converts plan delivery inputs to session delivery inputs (snapshot copy). */
export function planDeliveriesToSessionInputs(
  deliveries: PracticePlanDelivery[],
): CreateSessionDeliveryInput[] {
  return deliveries.map((delivery) => ({
    target_x: delivery.target_x,
    target_y: delivery.target_y,
    desired_speed_kmh: delivery.desired_speed_kmh,
    ball_type: delivery.ball_type,
    number_of_balls: delivery.number_of_balls,
    first_ball_delay_ms: delivery.first_ball_delay_ms,
    interval_ms: delivery.interval_ms,
  }));
}
