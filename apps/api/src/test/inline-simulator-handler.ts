import { randomUUID } from 'node:crypto';
import {
  MachineCommandSchema,
  type CommandAcknowledgement,
  type MachineCommand,
  type MachineStatus,
} from '@bowling-machine/api-contracts';

/**
 * Minimal in-process simulator for API integration tests.
 * Mirrors apps/esp32-simulator behavior without cross-package runtime dependency.
 */
export class InlineTestSimulatorHandler {
  private state: MachineStatus['state'] = 'READY';
  private homingStatus: MachineStatus['homing_status'] = 'NOT_HOMED';

  constructor(
    private readonly machineId: string,
    private readonly send: (message: unknown) => void,
    private readonly schedule: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>,
  ) {}

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
    const command = MachineCommandSchema.safeParse((parsed as { payload?: unknown }).payload);
    if (!command.success) {
      return;
    }
    this.handleCommand(command.data);
  }

  startHeartbeat(intervalMs: number): ReturnType<typeof setInterval> {
    return setInterval(() => {
      this.send({
        type: 'heartbeat',
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        payload: { machine_id: this.machineId, timestamp: new Date().toISOString() },
      });
    }, intervalMs);
  }

  private handleCommand(command: MachineCommand): void {
    switch (command.command_type) {
      case 'PING':
      case 'STATUS':
        this.ack(command, true, null, 'ok');
        this.publishStatus();
        break;
      case 'HOME':
        this.ack(command, true, null, 'Homing');
        this.state = 'HOMING';
        this.homingStatus = 'HOMING';
        this.schedule(() => {
          this.state = 'READY';
          this.homingStatus = 'HOMED';
          this.publishStatus();
        }, 200);
        break;
      case 'STOP':
        this.ack(command, true, null, 'Stop');
        this.state = 'STOPPING';
        this.schedule(() => {
          this.state = 'READY';
          this.publishStatus();
        }, 100);
        break;
      default:
        this.ack(command, false, 'COMMAND_REJECTED', 'Not implemented in inline test simulator');
    }
  }

  private ack(
    command: MachineCommand,
    accepted: boolean,
    errorCode: CommandAcknowledgement['error_code'],
    message: string,
  ): void {
    this.send({
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
    const status: MachineStatus = {
      machine_id: this.machineId,
      timestamp: new Date().toISOString(),
      kind: 'SIMULATOR',
      connection_status: 'CONNECTED',
      state: this.state,
      active_command_id: null,
      active_delivery_id: null,
      wheel1_current_rpm: 0,
      wheel2_current_rpm: 0,
      wheel1_target_rpm: null,
      wheel2_target_rpm: null,
      actuator_current_positions: [0, 0, 0, 0],
      actuator_target_positions: [0, 0, 0, 0],
      feeder_status: 'IDLE',
      homing_status: this.homingStatus,
      emergency_stop_active: false,
      active_fault: null,
    };
    this.send({
      type: 'telemetry.status',
      id: randomUUID(),
      timestamp: status.timestamp,
      payload: status,
    });
  }
}
