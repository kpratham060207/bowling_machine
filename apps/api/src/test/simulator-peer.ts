import WebSocket from 'ws';
import { MachineCommandSchema, type MachineCommand } from '@bowling-machine/api-contracts';
import { webSocketDataToString } from '../lib/ws-data.js';
import { InlineTestSimulatorHandler } from './inline-simulator-handler.js';

/**
 * In-process test simulator — connects to API /ws/machine like the real simulator package.
 */
export class TestSimulatorPeer {
  private ws: WebSocket | null = null;
  private handler: InlineTestSimulatorHandler | null = null;

  constructor(
    private readonly port: number,
    private readonly machineId: string,
    private readonly connectionSecret: string,
  ) {}

  async connect(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket(`ws://127.0.0.1:${String(this.port)}/ws/machine`, {
        headers: {
          'X-Machine-Id': this.machineId,
          'X-Machine-Secret': this.connectionSecret,
        },
      });

      this.ws.on('open', () => {
        this.handler = new InlineTestSimulatorHandler(
          this.machineId,
          (message) => {
            if (this.ws?.readyState === WebSocket.OPEN) {
              this.ws.send(JSON.stringify(message));
            }
          },
          (fn, delayMs) => setTimeout(fn, delayMs),
        );
        this.handler.startHeartbeat(1000);
        resolve();
      });

      this.ws.on('error', reject);
      this.ws.on('message', (data) => {
        this.handler?.handleWireMessage(webSocketDataToString(data));
      });
    });

    await sleep(200);
  }

  disconnect(): void {
    this.ws?.close();
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildTestThrowCommand(machineId: string): MachineCommand {
  const issuedAt = new Date().toISOString();
  return MachineCommandSchema.parse({
    command_id: crypto.randomUUID(),
    machine_id: machineId,
    protocol_version: '1.0',
    command_type: 'THROW_SEQUENCE',
    issued_at: issuedAt,
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    payload: {
      sequence_id: crypto.randomUUID(),
      delivery_count: 2,
      parameters: {
        wheel1_target_rpm: 1200,
        wheel2_target_rpm: 1180,
        actuator1_target_position: 0,
        actuator2_target_position: 0,
        actuator3_target_position: 0,
        actuator4_target_position: 0,
        feeder_delay_ms: 100,
        ball_count: 2,
        first_ball_delay_ms: 100,
        interval_ms: 200,
      },
    },
  });
}
