import type { MachineDeliveryParameters } from '@bowling-machine/api-contracts';
import type { SimulationCalibrationData } from '../calibration/types.js';
import type { MachineConfiguration } from '../types/machine-config.js';
import { invalidOutcome, validOutcome, type ValidationOutcome } from '../types/validation.js';

/**
 * Machine capability validation — checks calculated values against calibration/config bounds.
 * Does NOT claim physical safety — only software-layer achievability checks.
 */
export function validateMachineCapability(input: {
  parameters: MachineDeliveryParameters;
  calibration: SimulationCalibrationData;
  machineConfig?: MachineConfiguration;
}): ValidationOutcome {
  const errors: ValidationOutcome['errors'] = [];
  const warnings: string[] = [
    'Machine capability validation uses SIMULATION_CALIBRATION limits — not physical certification.',
  ];

  const limits = input.calibration.limits;
  const maxRpm = input.machineConfig?.max_wheel_rpm ?? limits.max_wheel_rpm;
  const minRpm = input.machineConfig?.min_wheel_rpm ?? limits.min_wheel_rpm;
  const maxBalls = input.machineConfig?.max_balls_per_sequence ?? limits.max_balls_per_sequence;

  const w1 = input.parameters.wheel1_target_rpm;
  const w2 = input.parameters.wheel2_target_rpm;

  if (w1 !== null && (w1 < minRpm || w1 > maxRpm)) {
    errors.push({
      code: 'UNSUPPORTED_CAPABILITY',
      message: `wheel1_target_rpm ${String(w1)} outside simulation capability range`,
      details: { min: minRpm, max: maxRpm },
    });
  }

  if (w2 !== null && (w2 < minRpm || w2 > maxRpm)) {
    errors.push({
      code: 'UNSUPPORTED_CAPABILITY',
      message: `wheel2_target_rpm ${String(w2)} outside simulation capability range`,
      details: { min: minRpm, max: maxRpm },
    });
  }

  if (input.parameters.ball_count > maxBalls) {
    errors.push({
      code: 'UNSUPPORTED_CAPABILITY',
      message: `ball_count exceeds simulation max (${String(maxBalls)})`,
    });
  }

  if (errors.length > 0) {
    return invalidOutcome('MACHINE_CAPABILITY', errors, warnings);
  }

  return validOutcome('MACHINE_CAPABILITY', warnings);
}
