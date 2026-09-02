import type {
  CalculationPreviewRequest,
  CalculationPreviewResponse,
} from '@bowling-machine/api-contracts';
import {
  createDefaultBallTypeRegistry,
  createSimulationCalculationEngine,
  DeliveryCalculationEngine,
  resolveEngineCalibrationData,
  StaticCalibrationProvider,
  SimulationPitchCoordinateMapper,
} from '@bowling-machine/calculation-engine';
import type { Database } from '@bowling-machine/database';
import { assertPlayerMachineAccess } from './machine-access.service.js';
import { DatabaseCalibrationProvider } from './calibration-provider.service.js';
import type { MachineService } from './machine.service.js';

const SIMULATION_DISCLAIMER =
  'Calculated values use simulation calibration only. They are backend-derived machine parameters — not physically validated and not observed machine measurements.';

const PREVIEW_DISCLAIMER =
  'Calculated values are computed from active machine calibration. They are backend-derived machine parameters — not observed machine measurements and not a guarantee of physical execution.';

/**
 * Software-only calculation — invokes Phase 1F engine without MachineGateway,
 * control locks, persistence, or machine command dispatch.
 */
export class CalculationPreviewService {
  private readonly calibrationProvider: DatabaseCalibrationProvider;
  private readonly defaultEngine = createSimulationCalculationEngine();

  constructor(
    private readonly db: Database['db'],
    private readonly machineService: MachineService,
  ) {
    this.calibrationProvider = new DatabaseCalibrationProvider(db);
  }

  async preview(
    userId: string,
    input: CalculationPreviewRequest,
  ): Promise<CalculationPreviewResponse> {
    const requested = {
      target: { target_x: input.target_x, target_y: input.target_y },
      desired_speed_kmh: input.desired_speed_kmh,
      ball_type: input.ball_type,
      number_of_balls: input.number_of_balls,
      first_ball_delay_ms: input.first_ball_delay_ms,
      interval_ms: input.interval_ms,
    };

    // Software-only mode with no machine context — simulation calibration only.
    if (!input.machine_id) {
      return this.previewWithSimulationEngine(requested, input, null);
    }

    await assertPlayerMachineAccess(this.db, userId, input.machine_id);

    const machine = await this.machineService.getMachineById(input.machine_id);
    const calibrationResult = await this.calibrationProvider.resolve(input.machine_id);
    const calibration = calibrationResult.profile;

    if (!calibration && machine.kind === 'HARDWARE') {
      return {
        preview: true,
        result_mode: 'PREVIEW',
        disclaimer: PREVIEW_DISCLAIMER,
        machine_id: input.machine_id,
        requested,
        calculated: null,
        validation: {
          valid: false,
          errors: [
            {
              code: 'MISSING_CALIBRATION',
              message: 'No active calibration profile available for this machine',
            },
          ],
        },
        calibration: null,
        warnings: [],
      };
    }

    const deliveryRequest = {
      machine_id: input.machine_id,
      target_x: input.target_x,
      target_y: input.target_y,
      desired_speed_kmh: input.desired_speed_kmh,
      ball_type: input.ball_type,
      number_of_balls: input.number_of_balls,
      first_ball_delay_ms: input.first_ball_delay_ms,
      interval_ms: input.interval_ms,
    };

    const calibrationData = calibration ? resolveEngineCalibrationData(calibration.data) : null;

    const engine =
      calibration !== null
        ? new DeliveryCalculationEngine({
            pitchMapper: new SimulationPitchCoordinateMapper(),
            calibrationProvider: new StaticCalibrationProvider(calibration),
            ballTypeRegistry: createDefaultBallTypeRegistry(),
          })
        : this.defaultEngine;

    const result = engine.calculate({
      request: deliveryRequest,
      machineConfig: {
        machine_id: input.machine_id,
        kind: machine.kind,
        max_wheel_rpm: calibrationData?.limits.max_wheel_rpm ?? null,
        min_wheel_rpm: calibrationData?.limits.min_wheel_rpm ?? null,
        min_interval_ms: calibrationData?.limits.min_interval_ms ?? null,
        max_balls_per_sequence: calibrationData?.limits.max_balls_per_sequence ?? null,
      },
    });

    const isSimulation =
      calibrationResult.is_simulation_fallback ||
      result.calibration?.simulation === true ||
      machine.kind === 'SIMULATOR';

    return {
      preview: true,
      result_mode: isSimulation ? 'SIMULATION' : 'PREVIEW',
      disclaimer: isSimulation ? SIMULATION_DISCLAIMER : PREVIEW_DISCLAIMER,
      machine_id: input.machine_id,
      requested,
      calculated: result.success ? result.parameters : null,
      validation: {
        valid: result.success,
        errors: result.errors.map((error) => ({
          code: error.code,
          message: error.message,
        })),
      },
      calibration: result.calibration
        ? {
            profile_id: result.calibration.profile_id,
            calibration_type: result.calibration.calibration_type,
            version: result.calibration.version,
            simulation: result.calibration.simulation,
            is_simulation_fallback: calibrationResult.is_simulation_fallback,
          }
        : null,
      warnings: result.warnings,
    };
  }

  /** Pure simulation calculation — no machine access or persistence required. */
  private previewWithSimulationEngine(
    requested: CalculationPreviewResponse['requested'],
    input: CalculationPreviewRequest,
    machineId: string | null,
  ): CalculationPreviewResponse {
    const deliveryRequest = {
      target_x: input.target_x,
      target_y: input.target_y,
      desired_speed_kmh: input.desired_speed_kmh,
      ball_type: input.ball_type,
      number_of_balls: input.number_of_balls,
      first_ball_delay_ms: input.first_ball_delay_ms,
      interval_ms: input.interval_ms,
    };

    const result = this.defaultEngine.calculate({ request: deliveryRequest });

    return {
      preview: true,
      result_mode: 'SIMULATION',
      disclaimer: SIMULATION_DISCLAIMER,
      machine_id: machineId,
      requested,
      calculated: result.success ? result.parameters : null,
      validation: {
        valid: result.success,
        errors: result.errors.map((error) => ({
          code: error.code,
          message: error.message,
        })),
      },
      calibration: result.calibration
        ? {
            profile_id: result.calibration.profile_id,
            calibration_type: result.calibration.calibration_type,
            version: result.calibration.version,
            simulation: true,
            is_simulation_fallback: true,
          }
        : null,
      warnings: result.warnings,
    };
  }
}
