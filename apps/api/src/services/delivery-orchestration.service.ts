import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq } from 'drizzle-orm';
import type {
  CreateDeliveryRequest,
  Delivery,
  MachineStatus,
} from '@bowling-machine/api-contracts';
import { CommandIdSchema } from '@bowling-machine/api-contracts';
import {
  createDefaultBallTypeRegistry,
  createSimulationCalculationEngine,
  DeliveryCalculationEngine,
  parseSimulationCalibrationData,
  SimulationPitchCoordinateMapper,
  StaticCalibrationProvider,
} from '@bowling-machine/calculation-engine';
import type { Database } from '@bowling-machine/database';
import { deliveries } from '@bowling-machine/database';
import { ApiHttpError } from '../errors/http-errors.js';
import { nowIso } from '../lib/machine-crypto.js';
import { assertPlayerMachineAccess } from './machine-access.service.js';
import { DatabaseCalibrationProvider } from './calibration-provider.service.js';
import { mapDeliveryRowToContract, mapParametersToCalculatedJson } from './delivery.mapper.js';
import type { MachineCommandService } from './machine-command.service.js';
import type { MachineService } from './machine.service.js';
import type { OrchestrationEventPublisher } from './orchestration-event-publisher.js';
import { assertSessionOwnership } from './ownership.service.js';
import type { SessionService } from './session.service.js';

type ActiveExecution = {
  deliveryId: string;
  sessionId: string;
  machineId: string;
  userId: string;
  sequenceNumber: number;
  numberOfBalls: number;
  commandId: string;
  /** Becomes true once telemetry shows this command id as active — prevents premature completion. */
  sawCommandActive: boolean;
};

/**
 * Orchestrates delivery calculation, persistence, machine dispatch, and completion handling.
 * The calculation engine remains pure — this service owns DB, gateway, and event integration.
 */
export class DeliveryOrchestrationService {
  private readonly calibrationProvider: DatabaseCalibrationProvider;
  /** Tracks in-flight throw sequences keyed by machine command id. */
  private readonly activeExecutions = new Map<string, ActiveExecution>();

  constructor(
    private readonly db: Database['db'],
    private readonly sessionService: SessionService,
    private readonly machineService: MachineService,
    private readonly commandService: MachineCommandService,
    private readonly eventPublisher: OrchestrationEventPublisher,
    private readonly defaultEngine: DeliveryCalculationEngine = createSimulationCalculationEngine(),
  ) {
    this.calibrationProvider = new DatabaseCalibrationProvider(db);
  }

  /** Creates a delivery row and executes it when no other delivery is in flight. */
  async createDelivery(input: {
    sessionId: string;
    userId: string;
    request: CreateDeliveryRequest;
    executeImmediately?: boolean;
  }): Promise<Delivery> {
    await assertSessionOwnership(this.db, input.sessionId, input.userId);
    const session = await this.sessionService.getSessionRow(input.sessionId);

    if (session.status !== 'ACTIVE' && session.status !== 'PAUSED') {
      throw ApiHttpError.conflict('Session is not accepting deliveries', {
        session_id: input.sessionId,
        status: session.status,
      });
    }

    const existingByCommand = input.request.command_id
      ? await this.findDeliveryByCommandId(input.request.command_id)
      : null;
    if (existingByCommand) {
      return mapDeliveryRowToContract(existingByCommand);
    }

    const sequenceNumber = await this.nextSequenceNumber(input.sessionId);
    const deliveryId = randomUUID();

    await this.db.insert(deliveries).values({
      id: deliveryId,
      sessionId: input.sessionId,
      sequenceNumber,
      targetX: String(input.request.target_x),
      targetY: String(input.request.target_y),
      desiredSpeedKmh: String(input.request.desired_speed_kmh),
      ballType: input.request.ball_type,
      numberOfBalls: input.request.number_of_balls,
      firstBallDelayMs: input.request.first_ball_delay_ms,
      intervalMs: input.request.interval_ms,
      uiX: input.request.ui ? String(input.request.ui.ui_x) : null,
      uiY: input.request.ui ? String(input.request.ui.ui_y) : null,
      status: 'PENDING',
    });

    if (input.executeImmediately !== false) {
      const hasExecuting = await this.hasExecutingDelivery(input.sessionId);
      if (!hasExecuting) {
        return this.executeNextPendingDelivery(input.sessionId, input.userId, {
          commandId: input.request.command_id,
        });
      }
    }

    const row = await this.getDeliveryRow(deliveryId);
    return mapDeliveryRowToContract(row);
  }

  /** Starts session execution by dispatching the first pending delivery. */
  async startSession(sessionId: string, userId: string): Promise<Delivery | null> {
    await assertSessionOwnership(this.db, sessionId, userId);
    const session = await this.sessionService.getSessionRow(sessionId);

    if (session.status !== 'ACTIVE') {
      throw ApiHttpError.conflict('Session cannot be started', { status: session.status });
    }

    await assertPlayerMachineAccess(this.db, userId, session.machineId);
    await this.assertMachinePreconditions(userId, session.machineId, { requireControlLock: true });

    const hasExecuting = await this.hasExecutingDelivery(sessionId);
    if (hasExecuting) {
      throw ApiHttpError.conflict('Session already has an executing delivery');
    }

    const pending = await this.getNextPendingDelivery(sessionId);
    if (!pending) {
      return null;
    }

    return this.executeDeliveryRow(pending, userId, session.machineId);
  }

  /** Executes the next pending delivery in sequence order. */
  async executeNextPendingDelivery(
    sessionId: string,
    userId: string,
    options?: { commandId?: string },
  ): Promise<Delivery> {
    const session = await this.sessionService.getSessionRow(sessionId);
    const pending = await this.getNextPendingDelivery(sessionId);

    if (!pending) {
      await this.finalizeSessionIfComplete(sessionId, userId);
      throw ApiHttpError.conflict('No pending deliveries remain in this session');
    }

    return this.executeDeliveryRow(pending, userId, session.machineId, options?.commandId);
  }

  /**
   * Stops the session safely — sends STOP to machine without requiring control lock (Phase 1E).
   * Idempotent when machine is already idle or session is terminal.
   */
  async stopSession(sessionId: string, userId: string): Promise<{ status: string }> {
    const session = await assertSessionOwnership(this.db, sessionId, userId);
    const sessionRow = await this.sessionService.getSessionRow(session.id);

    if (sessionRow.status === 'COMPLETED' || sessionRow.status === 'CANCELLED') {
      return { status: sessionRow.status };
    }

    await assertPlayerMachineAccess(this.db, userId, sessionRow.machineId);

    const executing = await this.getExecutingDeliveries(sessionId);
    for (const delivery of executing) {
      await this.markDeliveryCancelled(delivery.id, 'Stopped by player');
    }

    if (this.machineService.getLiveStatus(sessionRow.machineId).connection_status === 'CONNECTED') {
      const stopCommand = this.commandService.buildCommand(sessionRow.machineId, 'STOP', {
        reason: 'Session stop requested',
      });
      try {
        await this.commandService.dispatch(stopCommand, { sessionId });
      } catch {
        // STOP is best-effort — session cancellation proceeds even if machine is idle.
      }
    }

    this.clearActiveExecutionsForSession(sessionId);
    await this.sessionService.updateSessionStatus(sessionId, 'CANCELLED');

    this.eventPublisher.publishSessionCompleted({
      sessionId,
      playerId: userId,
      machineId: sessionRow.machineId,
      status: 'CANCELLED',
      totalBallsDelivered: sessionRow.totalBallsDelivered,
    });

    return { status: 'CANCELLED' };
  }

  /** Called by DeliveryExecutionTracker when machine status indicates sequence completion. */
  async handleMachineStatusUpdate(status: MachineStatus): Promise<void> {
    for (const [commandId, execution] of [...this.activeExecutions.entries()]) {
      if (execution.machineId !== status.machine_id) {
        continue;
      }

      if (status.active_command_id === commandId) {
        execution.sawCommandActive = true;
        this.activeExecutions.set(commandId, execution);
      }

      if (status.active_fault || status.state === 'ERROR' || status.emergency_stop_active) {
        await this.failExecution(
          commandId,
          execution,
          status.active_fault?.message ?? 'Machine fault',
        );
        continue;
      }

      if (
        execution.sawCommandActive &&
        status.active_command_id === null &&
        status.state === 'READY'
      ) {
        await this.completeExecution(commandId, execution, status);
      }
    }
  }

  /** Marks active delivery failed when machine fault events arrive. */
  async handleMachineFault(machineId: string, message: string): Promise<void> {
    for (const [commandId, execution] of [...this.activeExecutions.entries()]) {
      if (execution.machineId === machineId) {
        await this.failExecution(commandId, execution, message);
      }
    }
  }

  private async executeDeliveryRow(
    row: typeof deliveries.$inferSelect,
    userId: string,
    machineId: string,
    commandIdOverride?: string,
  ): Promise<Delivery> {
    await assertPlayerMachineAccess(this.db, userId, machineId);
    await this.assertMachinePreconditions(userId, machineId, { requireControlLock: true });

    const deliveryRequest = {
      machine_id: machineId,
      session_id: row.sessionId,
      target_x: Number(row.targetX),
      target_y: Number(row.targetY),
      desired_speed_kmh: Number(row.desiredSpeedKmh),
      ball_type: row.ballType,
      number_of_balls: row.numberOfBalls,
      first_ball_delay_ms: row.firstBallDelayMs,
      interval_ms: row.intervalMs,
    };

    const machine = await this.machineService.getMachineById(machineId);
    const calibrationResult = await this.calibrationProvider.resolve(machineId);

    if (!calibrationResult.profile && machine.kind === 'HARDWARE') {
      throw ApiHttpError.conflict('Calibration unavailable for this machine', {
        machine_id: machineId,
      });
    }

    const calibration = calibrationResult.profile;
    const calibrationData = calibration ? parseSimulationCalibrationData(calibration.data) : null;

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
        machine_id: machineId,
        kind: machine.kind,
        max_wheel_rpm: calibrationData?.limits.max_wheel_rpm ?? null,
        min_wheel_rpm: calibrationData?.limits.min_wheel_rpm ?? null,
        min_interval_ms: calibrationData?.limits.min_interval_ms ?? null,
        max_balls_per_sequence: calibrationData?.limits.max_balls_per_sequence ?? null,
      },
    });

    if (!result.success || !result.parameters) {
      await this.db
        .update(deliveries)
        .set({
          status: 'FAILED',
          error: {
            fault_code: result.errors[0]?.code ?? 'UNKNOWN',
            severity: 'ERROR',
            message: result.errors[0]?.message ?? 'Calculation failed',
            recoverable: true,
          },
          executedAt: nowIso(),
        })
        .where(eq(deliveries.id, row.id));

      throw mapCalculationFailure(result.errors[0]?.code, result.errors[0]?.message);
    }

    const calculatedJson = mapParametersToCalculatedJson(result.parameters);
    const commandId = CommandIdSchema.parse(commandIdOverride ?? randomUUID());

    await this.db
      .update(deliveries)
      .set({ calculatedParameters: calculatedJson })
      .where(eq(deliveries.id, row.id));

    const throwCommand = this.commandService.buildCommand(
      machineId,
      'THROW_SEQUENCE',
      {
        sequence_id: randomUUID(),
        delivery_id: row.id,
        delivery_count: row.numberOfBalls,
        parameters: result.parameters,
      },
      commandId,
    );

    let dispatchResult;
    try {
      dispatchResult = await this.commandService.dispatch(throwCommand, {
        sessionId: row.sessionId,
      });
    } catch (error) {
      await this.markDeliveryFailed(
        row.id,
        error instanceof Error ? error.message : 'Dispatch failed',
      );
      throw error;
    }

    if (dispatchResult.status === 'REJECTED' || dispatchResult.status === 'FAILED') {
      await this.markDeliveryFailed(
        row.id,
        dispatchResult.acknowledgement?.message ?? 'Machine rejected throw sequence',
      );
      throw ApiHttpError.conflict('Machine rejected throw sequence', {
        command_id: commandId,
        status: dispatchResult.status,
      });
    }

    await this.db
      .update(deliveries)
      .set({
        status: 'EXECUTING',
        machineCommandId: commandId,
        executedAt: nowIso(),
      })
      .where(eq(deliveries.id, row.id));

    this.activeExecutions.set(commandId, {
      deliveryId: row.id,
      sessionId: row.sessionId,
      machineId,
      userId,
      sequenceNumber: row.sequenceNumber,
      numberOfBalls: row.numberOfBalls,
      commandId,
      sawCommandActive: false,
    });

    this.eventPublisher.publishDeliveryStarted({
      sessionId: row.sessionId,
      deliveryId: row.id,
      sequenceNumber: row.sequenceNumber,
      playerId: userId,
      machineId,
    });

    const updated = await this.getDeliveryRow(row.id);
    return mapDeliveryRowToContract(updated);
  }

  private async completeExecution(
    commandId: string,
    execution: ActiveExecution,
    status: MachineStatus,
  ): Promise<void> {
    if (!this.activeExecutions.has(commandId)) {
      return;
    }

    this.activeExecutions.delete(commandId);

    await this.db
      .update(deliveries)
      .set({
        status: 'COMPLETED',
        measured: {
          wheel1_actual_rpm: status.wheel1_current_rpm,
          wheel2_actual_rpm: status.wheel2_current_rpm,
          landed_at: nowIso(),
        },
      })
      .where(eq(deliveries.id, execution.deliveryId));

    await this.sessionService.incrementBallsDelivered(execution.sessionId, execution.numberOfBalls);

    this.eventPublisher.publishDeliveryCompleted({
      sessionId: execution.sessionId,
      deliveryId: execution.deliveryId,
      sequenceNumber: execution.sequenceNumber,
      playerId: execution.userId,
      machineId: execution.machineId,
    });

    const hasPending = (await this.getNextPendingDelivery(execution.sessionId)) !== null;
    if (hasPending) {
      await this.executeNextPendingDelivery(execution.sessionId, execution.userId);
      return;
    }

    await this.finalizeSessionIfComplete(execution.sessionId, execution.userId);
  }

  private async failExecution(
    commandId: string,
    execution: ActiveExecution,
    message: string,
  ): Promise<void> {
    if (!this.activeExecutions.has(commandId)) {
      return;
    }

    this.activeExecutions.delete(commandId);
    await this.markDeliveryFailed(execution.deliveryId, message);

    this.eventPublisher.publishDeliveryFailed({
      sessionId: execution.sessionId,
      deliveryId: execution.deliveryId,
      sequenceNumber: execution.sequenceNumber,
      playerId: execution.userId,
      machineId: execution.machineId,
    });

    await this.sessionService.updateSessionStatus(execution.sessionId, 'CANCELLED');
    const session = await this.sessionService.getSessionRow(execution.sessionId);
    this.eventPublisher.publishSessionCompleted({
      sessionId: execution.sessionId,
      playerId: execution.userId,
      machineId: execution.machineId,
      status: 'CANCELLED',
      totalBallsDelivered: session.totalBallsDelivered,
    });
  }

  private async finalizeSessionIfComplete(sessionId: string, userId: string): Promise<void> {
    const pending = await this.getNextPendingDelivery(sessionId);
    const executing = await this.hasExecutingDelivery(sessionId);
    if (pending || executing) {
      return;
    }

    const session = await this.sessionService.getSessionRow(sessionId);
    if (session.status === 'COMPLETED' || session.status === 'CANCELLED') {
      return;
    }

    const failedRows = await this.db
      .select()
      .from(deliveries)
      .where(and(eq(deliveries.sessionId, sessionId), eq(deliveries.status, 'FAILED')));

    const terminalStatus = failedRows.length > 0 ? 'CANCELLED' : 'COMPLETED';
    await this.sessionService.updateSessionStatus(sessionId, terminalStatus);

    this.eventPublisher.publishSessionCompleted({
      sessionId,
      playerId: userId,
      machineId: session.machineId,
      status: terminalStatus,
      totalBallsDelivered: session.totalBallsDelivered,
    });
  }

  private async assertMachinePreconditions(
    userId: string,
    machineId: string,
    options: { requireControlLock: boolean },
  ): Promise<void> {
    const status = this.machineService.getLiveStatus(machineId);

    if (status.connection_status === 'DISCONNECTED') {
      throw ApiHttpError.conflict('Machine is not connected', { machine_id: machineId });
    }

    if (status.active_fault) {
      throw ApiHttpError.conflict('Machine has an active fault', {
        fault_code: status.active_fault.fault_code,
      });
    }

    if (status.emergency_stop_active) {
      throw ApiHttpError.conflict('Machine emergency stop is active');
    }

    if (status.homing_status !== 'HOMED') {
      throw ApiHttpError.conflict('Machine must be homed before throw sequence', {
        homing_status: status.homing_status,
      });
    }

    if (options.requireControlLock) {
      await this.machineService.assertActiveControl(userId, machineId);
    }
  }

  private async nextSequenceNumber(sessionId: string): Promise<number> {
    const rows = await this.db
      .select({ sequenceNumber: deliveries.sequenceNumber })
      .from(deliveries)
      .where(eq(deliveries.sessionId, sessionId))
      .orderBy(desc(deliveries.sequenceNumber))
      .limit(1);

    return (rows[0]?.sequenceNumber ?? 0) + 1;
  }

  private async getNextPendingDelivery(
    sessionId: string,
  ): Promise<typeof deliveries.$inferSelect | null> {
    const rows = await this.db
      .select()
      .from(deliveries)
      .where(and(eq(deliveries.sessionId, sessionId), eq(deliveries.status, 'PENDING')))
      .orderBy(asc(deliveries.sequenceNumber))
      .limit(1);

    return rows[0] ?? null;
  }

  private async hasExecutingDelivery(sessionId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: deliveries.id })
      .from(deliveries)
      .where(and(eq(deliveries.sessionId, sessionId), eq(deliveries.status, 'EXECUTING')))
      .limit(1);

    return rows.length > 0;
  }

  private async getExecutingDeliveries(
    sessionId: string,
  ): Promise<Array<typeof deliveries.$inferSelect>> {
    return this.db
      .select()
      .from(deliveries)
      .where(and(eq(deliveries.sessionId, sessionId), eq(deliveries.status, 'EXECUTING')));
  }

  private async getDeliveryRow(deliveryId: string): Promise<typeof deliveries.$inferSelect> {
    const rows = await this.db
      .select()
      .from(deliveries)
      .where(eq(deliveries.id, deliveryId))
      .limit(1);

    const row = rows[0];
    if (!row) {
      throw ApiHttpError.notFound('Delivery not found');
    }
    return row;
  }

  private async findDeliveryByCommandId(
    commandId: string,
  ): Promise<typeof deliveries.$inferSelect | null> {
    const rows = await this.db
      .select()
      .from(deliveries)
      .where(eq(deliveries.machineCommandId, commandId))
      .limit(1);

    return rows[0] ?? null;
  }

  private async markDeliveryFailed(deliveryId: string, message: string): Promise<void> {
    await this.db
      .update(deliveries)
      .set({
        status: 'FAILED',
        error: {
          fault_code: 'UNKNOWN',
          severity: 'ERROR',
          message,
          recoverable: true,
        },
        executedAt: nowIso(),
      })
      .where(eq(deliveries.id, deliveryId));
  }

  private async markDeliveryCancelled(deliveryId: string, message: string): Promise<void> {
    await this.db
      .update(deliveries)
      .set({
        status: 'CANCELLED',
        error: {
          fault_code: 'UNKNOWN',
          severity: 'INFO',
          message,
          recoverable: true,
        },
        executedAt: nowIso(),
      })
      .where(eq(deliveries.id, deliveryId));
  }

  private clearActiveExecutionsForSession(sessionId: string): void {
    for (const [commandId, execution] of this.activeExecutions.entries()) {
      if (execution.sessionId === sessionId) {
        this.activeExecutions.delete(commandId);
      }
    }
  }
}

function mapCalculationFailure(
  code: string | undefined,
  message: string | undefined,
): ApiHttpError {
  const normalized = code ?? 'UNKNOWN';
  const text = message ?? 'Delivery calculation failed';

  if (normalized === 'MISSING_CALIBRATION' || normalized === 'INVALID_CALIBRATION') {
    return new ApiHttpError(409, 'MACHINE_NOT_CALIBRATED', text);
  }

  if (
    normalized === 'STRUCTURAL_VALIDATION_FAILED' ||
    normalized === 'INVALID_BALL_TYPE' ||
    normalized === 'INVALID_TARGET'
  ) {
    return ApiHttpError.validation(text, { code: normalized });
  }

  if (normalized === 'MACHINE_CAPABILITY_VIOLATION' || normalized === 'SAFETY_VALIDATION_FAILED') {
    return ApiHttpError.validation(text, { code: normalized });
  }

  return ApiHttpError.validation(text, { code: normalized });
}
