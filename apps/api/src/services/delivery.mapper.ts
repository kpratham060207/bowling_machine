import type {
  Delivery,
  DeliveryRequest,
  MachineDeliveryParameters,
} from '@bowling-machine/api-contracts';
import type { CalculatedParametersJson, Delivery as DeliveryRow } from '@bowling-machine/database';

/**
 * Maps a database delivery row to the public Delivery contract.
 * Preserves requested vs calculated vs measured separation from Phase 1C schema.
 */
export function mapDeliveryRowToContract(row: DeliveryRow): Delivery {
  const requested: DeliveryRequest = {
    target_x: Number(row.targetX),
    target_y: Number(row.targetY),
    desired_speed_kmh: Number(row.desiredSpeedKmh),
    ball_type: row.ballType,
    number_of_balls: row.numberOfBalls,
    first_ball_delay_ms: row.firstBallDelayMs,
    interval_ms: row.intervalMs,
    session_id: row.sessionId,
    ...(row.uiX != null && row.uiY != null
      ? { ui: { ui_x: Number(row.uiX), ui_y: Number(row.uiY) } }
      : {}),
  };

  return {
    delivery_id: row.id,
    session_id: row.sessionId,
    sequence_number: row.sequenceNumber,
    requested,
    calculated_parameters: row.calculatedParameters
      ? mapCalculatedJsonToContract(row.calculatedParameters)
      : null,
    command_id: row.machineCommandId,
    status: row.status,
    error: row.error
      ? {
          fault_code: row.error.fault_code as 'UNKNOWN',
          severity: row.error.severity as 'ERROR',
          message: row.error.message,
          recoverable: row.error.recoverable,
          timestamp: row.executedAt ?? row.createdAt,
          machine_id: '',
        }
      : null,
    measured: row.measured ?? undefined,
    created_at: row.createdAt,
    executed_at: row.executedAt ?? undefined,
  };
}

function mapCalculatedJsonToContract(json: CalculatedParametersJson): MachineDeliveryParameters {
  return {
    wheel1_target_rpm: json.wheel1_target_rpm,
    wheel2_target_rpm: json.wheel2_target_rpm,
    actuator1_target_position: json.actuator1_target_position,
    actuator2_target_position: json.actuator2_target_position,
    actuator3_target_position: json.actuator3_target_position,
    actuator4_target_position: json.actuator4_target_position,
    feeder_delay_ms: json.feeder_delay_ms,
    ball_count: json.ball_count,
    first_ball_delay_ms: json.first_ball_delay_ms,
    interval_ms: json.interval_ms,
  };
}

/** Converts engine output to the JSONB snapshot stored on deliveries.calculated_parameters. */
export function mapParametersToCalculatedJson(
  parameters: MachineDeliveryParameters,
): CalculatedParametersJson {
  return {
    wheel1_target_rpm: parameters.wheel1_target_rpm,
    wheel2_target_rpm: parameters.wheel2_target_rpm,
    actuator1_target_position: parameters.actuator1_target_position,
    actuator2_target_position: parameters.actuator2_target_position,
    actuator3_target_position: parameters.actuator3_target_position,
    actuator4_target_position: parameters.actuator4_target_position,
    feeder_delay_ms: parameters.feeder_delay_ms,
    ball_count: parameters.ball_count,
    first_ball_delay_ms: parameters.first_ball_delay_ms,
    interval_ms: parameters.interval_ms,
  };
}
