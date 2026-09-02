import type { DeliveryRequest } from '@bowling-machine/api-contracts';
import type { MachineDeliveryParameters } from '@bowling-machine/api-contracts';
import type { SimulationCalibrationData } from '../calibration/types.js';
import type { MachineConfiguration } from '../types/machine-config.js';
import { invalidOutcome, validOutcome, type ValidationOutcome } from '../types/validation.js';

/**
 * Safety validation (software layer) — business rules before command dispatch.
 * ESP32 firmware remains the authority for physical safety.
 */
export function validateSafety(input: {
  request: DeliveryRequest;
  parameters: MachineDeliveryParameters;
  calibration: SimulationCalibrationData;
  machineConfig?: MachineConfiguration;
}): ValidationOutcome {
  const errors: ValidationOutcome['errors'] = [];
  const warnings: string[] = [
    'Software safety validation only — ESP32 firmware performs physical safety checks.',
  ];

  const minInterval =
    input.machineConfig?.min_interval_ms ?? input.calibration.limits.min_interval_ms;

  if (input.parameters.interval_ms < minInterval) {
    errors.push({
      code: 'UNSUPPORTED_CAPABILITY',
      message: `interval_ms below minimum safe interval (${String(minInterval)} ms)`,
    });
  }

  if (input.request.number_of_balls !== input.parameters.ball_count) {
    errors.push({
      code: 'CALCULATION_FAILURE',
      message: 'ball_count mismatch between request and calculated parameters',
    });
  }

  if (errors.length > 0) {
    return invalidOutcome('SAFETY', errors, warnings);
  }

  return validOutcome('SAFETY', warnings);
}
