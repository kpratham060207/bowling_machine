import type { DeliveryRequest } from '@bowling-machine/api-contracts';
import type { MachineDeliveryParameters } from '@bowling-machine/api-contracts';
import type { BallTypeStrategyRegistry } from '../ball-type/ball-type-registry.js';
import { createDefaultBallTypeRegistry } from '../ball-type/ball-type-registry.js';
import type { CalibrationProvider } from '../calibration/types.js';
import {
  parseSimulationCalibrationData,
  StaticCalibrationProvider,
  type SimulationCalibrationData,
} from '../calibration/types.js';
import { calculationError } from '../errors/calculation-error.js';
import { SIMULATION_CALIBRATION_V1_PROFILE } from '../fixtures/simulation-calibration-v1.js';
import type { PitchCoordinateMapper } from '../pitch-mapper/types.js';
import { SimulationPitchCoordinateMapper } from '../pitch-mapper/simulation-pitch-mapper.js';
import type { CalculationResult } from '../types/calculation-result.js';
import type { MachineConfiguration } from '../types/machine-config.js';
import type { TrajectoryRepresentation } from '../types/trajectory.js';
import type { ValidationOutcome } from '../types/validation.js';
import { validateMachineCapability } from '../validation/machine-capability-validator.js';
import { validateSafety } from '../validation/safety-validator.js';
import { validateStructural } from '../validation/structural-validator.js';

export type DeliveryCalculationEngineOptions = {
  pitchMapper: PitchCoordinateMapper;
  calibrationProvider: CalibrationProvider;
  ballTypeRegistry: BallTypeStrategyRegistry;
};

/**
 * Calibration-driven delivery calculation engine (Phase 1F).
 *
 * Pipeline:
 * DeliveryRequest → structural validation → pitch mapper → trajectory →
 * calibration → machine parameters → capability validation → safety validation
 *
 * No database, Fastify, React, or simulator dependencies in core logic.
 */
export class DeliveryCalculationEngine {
  constructor(private readonly options: DeliveryCalculationEngineOptions) {}

  calculate(input: { request: unknown; machineConfig?: MachineConfiguration }): CalculationResult {
    const { outcome: structural, parsed } = validateStructural(input.request);

    if (!parsed) {
      return failedResult({
        request: input.request as DeliveryRequest,
        structural,
        errors: structural.errors.map((e) =>
          calculationError('STRUCTURAL_VALIDATION_FAILED', e.message, e.details),
        ),
      });
    }

    const request = parsed;
    const pitch_target = { target_x: request.target_x, target_y: request.target_y };

    const ballStrategy = this.options.ballTypeRegistry.get(request.ball_type);
    if (!ballStrategy) {
      return failedResult({
        request,
        pitch_target,
        structural,
        errors: [
          calculationError('INVALID_BALL_TYPE', `Unsupported ball type: ${request.ball_type}`),
        ],
      });
    }

    const calibrationProfile = this.options.calibrationProvider.resolve(request.machine_id);
    if (!calibrationProfile) {
      return failedResult({
        request,
        pitch_target,
        structural,
        errors: [calculationError('MISSING_CALIBRATION', 'No calibration profile available')],
      });
    }

    const calibrationData = parseSimulationCalibrationData(calibrationProfile.data);
    if (!calibrationData) {
      return failedResult({
        request,
        pitch_target,
        structural,
        errors: [
          calculationError('INVALID_CALIBRATION', 'Calibration data is missing or malformed', {
            profile_id: calibrationProfile.profile_id,
            calibration_type: calibrationProfile.calibration_type,
          }),
        ],
      });
    }

    const pitch_reference = this.options.pitchMapper.map(pitch_target);
    const trajectory = buildTrajectory(request, pitch_reference, ballStrategy.profile);

    let parameters: MachineDeliveryParameters;
    try {
      parameters = calculateMachineParameters(
        request,
        trajectory,
        calibrationData,
        ballStrategy.profile,
      );
    } catch (error) {
      return failedResult({
        request,
        pitch_target,
        pitch_reference,
        trajectory,
        calibration: toCalibrationIdentity(calibrationProfile, calibrationData),
        structural,
        errors: [
          calculationError(
            'CALCULATION_FAILURE',
            error instanceof Error ? error.message : 'Calculation failed',
          ),
        ],
      });
    }

    const capability = validateMachineCapability({
      parameters,
      calibration: calibrationData,
      machineConfig: input.machineConfig,
    });

    if (!capability.valid) {
      return failedResult({
        request,
        pitch_target,
        pitch_reference,
        trajectory,
        calibration: toCalibrationIdentity(calibrationProfile, calibrationData),
        structural,
        capability_validation: capability,
        parameters,
        errors: capability.errors.map((e) =>
          calculationError('UNSUPPORTED_CAPABILITY', e.message, e.details),
        ),
        warnings: capability.warnings,
      });
    }

    const safety = validateSafety({
      request,
      parameters,
      calibration: calibrationData,
      machineConfig: input.machineConfig,
    });

    if (!safety.valid) {
      return failedResult({
        request,
        pitch_target,
        pitch_reference,
        trajectory,
        calibration: toCalibrationIdentity(calibrationProfile, calibrationData),
        structural,
        capability_validation: capability,
        safety_validation: safety,
        parameters,
        errors: safety.errors.map((e) =>
          calculationError('UNSUPPORTED_CAPABILITY', e.message, e.details),
        ),
        warnings: [...capability.warnings, ...safety.warnings],
      });
    }

    return {
      success: true,
      request,
      pitch_target,
      pitch_reference,
      trajectory,
      calibration: toCalibrationIdentity(calibrationProfile, calibrationData),
      parameters,
      structural_validation: structural,
      capability_validation: capability,
      safety_validation: safety,
      errors: [],
      warnings: [...capability.warnings, ...safety.warnings],
    };
  }
}

function buildTrajectory(
  request: DeliveryRequest,
  pitch_reference: TrajectoryRepresentation['pitch_reference'],
  profile: {
    length_bias: number;
    launch_bias: number;
    trajectory_class: string;
  },
): TrajectoryRepresentation {
  return {
    pitch_reference,
    desired_speed_kmh: request.desired_speed_kmh,
    ball_type: request.ball_type,
    trajectory_class: profile.trajectory_class,
    launch_bias_simulated: profile.launch_bias,
    length_bias_simulated: profile.length_bias,
    simulation: true,
  };
}

/**
 * Converts trajectory + calibration into MachineDeliveryParameters.
 * All actuator values use UNRESOLVED simulation units (UD-02).
 */
function calculateMachineParameters(
  request: DeliveryRequest,
  trajectory: TrajectoryRepresentation,
  calibration: SimulationCalibrationData,
  ballProfile: {
    speed_multiplier: number;
    wheel_differential_factor: number;
    length_bias: number;
  },
): MachineDeliveryParameters {
  const adjustedReferenceY = clamp01(
    trajectory.pitch_reference.reference_y + ballProfile.length_bias,
  );

  const baseRpm =
    request.desired_speed_kmh *
    calibration.speed_rpm.base_rpm_per_kmh *
    ballProfile.speed_multiplier;

  const differential =
    ballProfile.wheel_differential_factor * calibration.speed_rpm.max_wheel_differential_rpm;

  const wheel1 = round2(baseRpm + differential);
  const wheel2 = round2(baseRpm - differential);

  const scale = calibration.position.actuator_scale;
  const actuator1 = round2(trajectory.pitch_reference.reference_x * scale);
  const actuator2 = round2(adjustedReferenceY * scale);
  const actuator3 = round2((trajectory.pitch_reference.reference_x - 0.5) * scale);
  const actuator4 = round2((adjustedReferenceY - 0.5) * scale);

  return {
    wheel1_target_rpm: wheel1,
    wheel2_target_rpm: wheel2,
    actuator1_target_position: actuator1,
    actuator2_target_position: actuator2,
    actuator3_target_position: actuator3,
    actuator4_target_position: actuator4,
    feeder_delay_ms: calibration.feeder.base_delay_ms,
    ball_count: request.number_of_balls,
    first_ball_delay_ms: request.first_ball_delay_ms,
    interval_ms: request.interval_ms,
  };
}

function toCalibrationIdentity(
  profile: { profile_id: string; calibration_type: string; version: number },
  data: SimulationCalibrationData,
) {
  return {
    profile_id: profile.profile_id,
    calibration_type: profile.calibration_type,
    version: profile.version,
    simulation: data._simulation,
  };
}

function failedResult(partial: {
  request: DeliveryRequest;
  structural: ValidationOutcome;
  errors: CalculationResult['errors'];
  pitch_target?: CalculationResult['pitch_target'];
  pitch_reference?: CalculationResult['pitch_reference'];
  trajectory?: CalculationResult['trajectory'];
  calibration?: CalculationResult['calibration'];
  parameters?: CalculationResult['parameters'];
  capability_validation?: CalculationResult['capability_validation'];
  safety_validation?: CalculationResult['safety_validation'];
  warnings?: string[];
}): CalculationResult {
  return {
    success: false,
    request: partial.request,
    pitch_target: partial.pitch_target ?? {
      target_x: partial.request.target_x,
      target_y: partial.request.target_y,
    },
    pitch_reference: partial.pitch_reference ?? null,
    trajectory: partial.trajectory ?? null,
    calibration: partial.calibration ?? null,
    parameters: partial.parameters ?? null,
    structural_validation: partial.structural,
    capability_validation: partial.capability_validation ?? null,
    safety_validation: partial.safety_validation ?? null,
    errors: partial.errors,
    warnings: partial.warnings ?? [],
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Factory for the default simulation engine wiring. */
export function createSimulationCalculationEngine(): DeliveryCalculationEngine {
  return new DeliveryCalculationEngine({
    pitchMapper: new SimulationPitchCoordinateMapper(),
    calibrationProvider: new StaticCalibrationProvider(SIMULATION_CALIBRATION_V1_PROFILE),
    ballTypeRegistry: createDefaultBallTypeRegistry(),
  });
}
