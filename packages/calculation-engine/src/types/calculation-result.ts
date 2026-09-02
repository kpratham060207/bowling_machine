import type { DeliveryRequest } from '@bowling-machine/api-contracts';
import type { MachineDeliveryParameters } from '@bowling-machine/api-contracts';
import type { PitchTarget } from '@bowling-machine/api-contracts';
import type { CalculationError } from '../errors/calculation-error.js';
import type { PitchReferenceCoordinate } from './pitch-reference.js';
import type { TrajectoryRepresentation } from './trajectory.js';
import type { ValidationOutcome } from './validation.js';

/** Identifies which calibration profile/version produced a result. */
export type CalibrationIdentity = {
  profile_id: string;
  calibration_type: string;
  version: number;
  simulation: boolean;
};

/**
 * Full calculation result — original request is never overwritten.
 * Caller inspects success, parameters, validation layers, and errors.
 */
export type CalculationResult = {
  success: boolean;
  /** Original user request preserved verbatim. */
  request: DeliveryRequest;
  /** Authoritative normalized pitch target from request. */
  pitch_target: PitchTarget;
  pitch_reference: PitchReferenceCoordinate | null;
  trajectory: TrajectoryRepresentation | null;
  calibration: CalibrationIdentity | null;
  parameters: MachineDeliveryParameters | null;
  structural_validation: ValidationOutcome;
  capability_validation: ValidationOutcome | null;
  safety_validation: ValidationOutcome | null;
  errors: CalculationError[];
  warnings: string[];
};
