import { randomUUID } from 'node:crypto';
import {
  MachineCommandSchema,
  PROTOCOL_VERSION,
  type CommandAcknowledgement,
  type MachineCommand,
  type MachineDeliveryParameters,
  type MachineStatus,
} from '@bowling-machine/api-contracts';
import {
  COMMAND_READY_STATES,
  canAcceptMotionCommand,
  createInitialRuntime,
  transitionState,
  type SimulatorRuntime,
} from './runtime.js';
import { shouldInjectFailure, type FailureMode } from './failure-injection.js';

export type SimulatorCallbacks = {
  send: (message: unknown) => void;
  schedule: (fn: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
};

type SimulatorOptions = {
  machineKind?: 'SIMULATOR' | 'HARDWARE';
};

/** Returns true when required machine parameters contain null values — real ESP32 must reject these. */
function hasNullRequiredParameters(parameters: MachineDeliveryParameters): boolean {
  return (
    parameters.wheel1_target_rpm === null ||
    parameters.wheel2_target_rpm === null ||
    parameters.feeder_delay_ms === null
  );
}

/**
 * Handles domain commands for the simulator — validates, acks, transitions state,
 * and emits telemetry/events. Mirrors the ESP32 peer contract for protocol parity.
 */
export class SimulatorCommandHandler {
  readonly runtime: SimulatorRuntime;
  private heartbeatSequence = 0;

  constructor(
    machineId: string,
    private readonly callbacks: SimulatorCallbacks,
    private readonly failureMode: FailureMode,
    options: SimulatorOptions = {},
  ) {
    this.runtime = createInitialRuntime(machineId, options.machineKind ?? 'SIMULATOR');
    this.bootstrap();
  }

  private bootstrap(): void {
    this.callbacks.schedule(() => {
      transitionState(this.runtime, 'READY');
      this.runtime.homingStatus = 'NOT_HOMED';
      this.publishStatus();
    }, 100);
  }

  startHeartbeat(intervalMs: number): ReturnType<typeof setInterval> {
    return setInterval(() => {
      if (shouldInjectFailure(this.failureMode, 'heartbeat_timeout')) {
        return;
      }
      this.heartbeatSequence += 1;
      this.callbacks.send({
        type: 'heartbeat',
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        payload: {
          machine_id: this.runtime.machineId,
          timestamp: new Date().toISOString(),
          sequence: this.heartbeatSequence,
        },
      });
    }, intervalMs);
  }

  handleWireMessage(raw: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      (parsed as { type?: string }).type !== 'command.dispatch'
    ) {
      return;
    }

    const payload = (parsed as { payload?: unknown }).payload;
    const commandResult = MachineCommandSchema.safeParse(payload);
    if (!commandResult.success) {
      return;
    }

    this.handleCommand(commandResult.data);
  }

  private handleCommand(command: MachineCommand): void {
    if (shouldInjectFailure(this.failureMode, 'command_timeout')) {
      return;
    }

    const incomingVersion: string = command.protocol_version;
    if (incomingVersion !== PROTOCOL_VERSION) {
      this.sendAck(command, false, 'COMMAND_REJECTED', 'Unsupported protocol version');
      return;
    }

    if (command.expires_at && new Date(command.expires_at).getTime() <= Date.now()) {
      this.sendAck(command, false, 'COMMAND_EXPIRED', 'Command expired');
      return;
    }

    if (shouldInjectFailure(this.failureMode, 'machine_fault')) {
      this.runtime.activeFaultCode = 'UNKNOWN';
      transitionState(this.runtime, 'ERROR');
      this.sendAck(command, false, 'UNKNOWN', 'Injected machine fault');
      this.publishStatus();
      return;
    }

    switch (command.command_type) {
      case 'PING':
        this.sendAck(command, true, null, 'PONG');
        break;
      case 'STATUS':
        this.sendAck(command, true, null, 'Status snapshot follows');
        this.publishStatus();
        break;
      case 'HOME':
        this.handleHome(command);
        break;
      case 'STOP':
        this.handleStop(command);
        break;
      case 'PAUSE':
      case 'RESUME':
        this.sendAck(command, true, null, `${command.command_type} simulated (no-op)`);
        break;
      case 'SET_CONFIGURATION':
        this.handleSetConfiguration(command);
        break;
      case 'THROW_SEQUENCE':
        this.handleThrowSequence(command);
        break;
      default:
        this.sendAck(command, false, 'COMMAND_REJECTED', 'Unknown command');
    }
  }

  private handleSetConfiguration(command: MachineCommand): void {
    if (command.command_type !== 'SET_CONFIGURATION') {
      return;
    }

    this.runtime.storedCalibration = command.payload.data;
    this.sendAck(command, true, null, 'Configuration stored (simulated NVS)');
  }

  private handleHome(command: MachineCommand): void {
    if (!canAcceptMotionCommand(this.runtime)) {
      this.sendAck(command, false, 'COMMAND_REJECTED', 'Cannot home in current state');
      return;
    }

    this.runtime.activeCommandId = command.command_id;
    this.sendAck(command, true, null, 'Homing started');
    const previous = transitionState(this.runtime, 'HOMING');
    this.runtime.homingStatus = 'HOMING';
    this.emitStateChanged(previous, 'HOMING');

    this.callbacks.schedule(() => {
      if (shouldInjectFailure(this.failureMode, 'actuator_failure')) {
        this.runtime.homingStatus = 'FAULT';
        transitionState(this.runtime, 'ERROR');
        this.publishStatus();
        return;
      }
      this.runtime.homingStatus = 'HOMED';
      const prev = transitionState(this.runtime, 'READY');
      this.runtime.activeCommandId = null;
      this.emitStateChanged(prev, 'READY');
      this.publishStatus();
    }, 300);
  }

  private handleStop(command: MachineCommand): void {
    this.runtime.activeCommandId = command.command_id;
    this.sendAck(command, true, null, 'Stop accepted');
    const previous = transitionState(this.runtime, 'STOPPING');
    this.emitStateChanged(previous, 'STOPPING');

    this.callbacks.schedule(() => {
      this.runtime.wheel1CurrentRpm = 0;
      this.runtime.wheel2CurrentRpm = 0;
      this.runtime.sequenceRemaining = 0;
      this.runtime.sequenceTotal = 0;
      this.runtime.activeDeliveryId = null;
      const prev = transitionState(this.runtime, 'READY');
      this.runtime.activeCommandId = null;
      this.emitStateChanged(prev, 'READY');
      this.publishStatus();
    }, 200);
  }

  private handleThrowSequence(command: MachineCommand): void {
    if (command.command_type !== 'THROW_SEQUENCE') {
      return;
    }

    if (!canAcceptMotionCommand(this.runtime)) {
      this.sendAck(command, false, 'COMMAND_REJECTED', 'Machine not ready');
      return;
    }

    if (!COMMAND_READY_STATES.has(this.runtime.state) && this.runtime.state !== 'READY') {
      this.sendAck(command, false, 'COMMAND_REJECTED', 'Machine must be READY for throw sequence');
      return;
    }

    if (this.runtime.homingStatus !== 'HOMED') {
      this.sendAck(command, false, 'COMMAND_REJECTED', 'Machine must be homed first');
      return;
    }

    const parameters = command.payload.parameters;
    if (hasNullRequiredParameters(parameters)) {
      this.sendAck(
        command,
        false,
        'UNCALIBRATED',
        'Required machine parameters are not calibrated',
      );
      return;
    }

    if (shouldInjectFailure(this.failureMode, 'feeder_failure')) {
      this.sendAck(command, false, 'FEEDER_JAM', 'Injected feeder failure');
      return;
    }

    const deliveryCount = command.payload.delivery_count;
    this.runtime.sequenceRemaining = deliveryCount;
    this.runtime.sequenceTotal = deliveryCount;
    this.runtime.activeDeliveryId = command.payload.delivery_id ?? null;
    this.runtime.activeCommandId = command.command_id;
    this.runtime.wheel1TargetRpm = parameters.wheel1_target_rpm;
    this.runtime.wheel2TargetRpm = parameters.wheel2_target_rpm;
    this.sendAck(command, true, null, 'Throw sequence accepted');

    this.simulateThrowSequence(deliveryCount, parameters);
  }

  private simulateThrowSequence(
    deliveryCount: number,
    parameters: MachineDeliveryParameters,
  ): void {
    const runBall = (index: number): void => {
      if (index >= deliveryCount) {
        this.runtime.activeCommandId = null;
        this.runtime.activeDeliveryId = null;
        this.runtime.sequenceRemaining = 0;
        transitionState(this.runtime, 'READY');
        this.publishStatus();
        return;
      }

      let previous = transitionState(this.runtime, 'POSITIONING');
      this.emitStateChanged(previous, 'POSITIONING');

      this.callbacks.schedule(() => {
        previous = transitionState(this.runtime, 'SPINNING_UP');
        this.emitStateChanged(previous, 'SPINNING_UP');

        if (shouldInjectFailure(this.failureMode, 'wheel_spinup_failure')) {
          transitionState(this.runtime, 'ERROR');
          this.runtime.activeFaultCode = 'RPM_NOT_ACHIEVED';
          this.publishStatus();
          return;
        }

        this.runtime.wheel1TargetRpm = parameters.wheel1_target_rpm;
        this.runtime.wheel2TargetRpm = parameters.wheel2_target_rpm;

        this.callbacks.schedule(() => {
          this.runtime.wheel1CurrentRpm = parameters.wheel1_target_rpm;
          this.runtime.wheel2CurrentRpm = parameters.wheel2_target_rpm;
          previous = transitionState(this.runtime, 'READY_TO_THROW');
          this.emitStateChanged(previous, 'READY_TO_THROW');

          this.callbacks.schedule(() => {
            previous = transitionState(this.runtime, 'FEEDING');
            this.runtime.feederStatus = 'FEEDING';
            this.emitStateChanged(previous, 'FEEDING');

            this.callbacks.schedule(() => {
              this.runtime.feederStatus = 'IDLE';
              this.runtime.sequenceRemaining = deliveryCount - index - 1;
              previous = transitionState(this.runtime, 'WAITING');
              this.emitStateChanged(previous, 'WAITING');
              this.publishStatus();
              runBall(index + 1);
            }, 150);
          }, parameters.feeder_delay_ms ?? 100);
        }, 200);
      }, 150);
    };

    runBall(0);
  }

  triggerEmergencyStop(): void {
    this.runtime.emergencyStopActive = true;
    const previous = transitionState(this.runtime, 'EMERGENCY_STOP');
    this.emitStateChanged(previous, 'EMERGENCY_STOP');
    this.callbacks.send({
      type: 'event.emergency_stop',
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      payload: {
        machine_id: this.runtime.machineId,
        active: true,
        timestamp: new Date().toISOString(),
      },
    });
    this.publishStatus();
  }

  private sendAck(
    command: MachineCommand,
    accepted: boolean,
    errorCode: CommandAcknowledgement['error_code'],
    message: string,
  ): void {
    this.callbacks.send({
      type: 'command.ack',
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      payload: {
        command_id: command.command_id,
        machine_id: command.machine_id,
        protocol_version: command.protocol_version,
        timestamp: new Date().toISOString(),
        accepted,
        error_code: accepted ? null : errorCode,
        message,
      },
    });
  }

  private publishStatus(): void {
    const ballsDelivered =
      this.runtime.sequenceTotal > 0
        ? this.runtime.sequenceTotal - this.runtime.sequenceRemaining
        : 0;

    const status: MachineStatus = {
      machine_id: this.runtime.machineId,
      timestamp: new Date().toISOString(),
      kind: this.runtime.machineKind,
      connection_status: 'CONNECTED',
      state: this.runtime.state,
      active_command_id: this.runtime.activeCommandId,
      active_delivery_id: this.runtime.activeDeliveryId,
      wheel1_current_rpm: this.runtime.wheel1CurrentRpm,
      wheel2_current_rpm: this.runtime.wheel2CurrentRpm,
      wheel1_target_rpm: this.runtime.wheel1TargetRpm,
      wheel2_target_rpm: this.runtime.wheel2TargetRpm,
      actuator_current_positions: [0, 0, 0, 0],
      actuator_target_positions: [0, 0, 0, 0],
      feeder_status: this.runtime.feederStatus,
      homing_status: this.runtime.homingStatus,
      emergency_stop_active: this.runtime.emergencyStopActive,
      active_fault: this.runtime.activeFaultCode
        ? {
            fault_code: this.runtime.activeFaultCode as 'UNKNOWN',
            severity: 'ERROR',
            timestamp: new Date().toISOString(),
            machine_id: this.runtime.machineId,
            message: 'Simulated fault',
            recoverable: true,
          }
        : null,
      ...(this.runtime.activeDeliveryId && this.runtime.sequenceTotal > 0
        ? {
            delivery_progress: {
              delivery_id: this.runtime.activeDeliveryId,
              balls_delivered: ballsDelivered,
              balls_remaining: this.runtime.sequenceRemaining,
            },
          }
        : {}),
    };

    this.callbacks.send({
      type: 'telemetry.status',
      id: randomUUID(),
      timestamp: status.timestamp,
      payload: status,
    });
  }

  private emitStateChanged(previous: string, next: string): void {
    this.callbacks.send({
      type: 'event.state_changed',
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      payload: {
        machine_id: this.runtime.machineId,
        previous_state: previous,
        new_state: next,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
