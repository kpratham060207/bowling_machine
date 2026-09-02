import WebSocket from 'ws';
import type { RawData } from 'ws';
import { webSocketDataToString } from './ws-data.js';
import { parseFailureMode } from './simulator/failure-injection.js';
import { SimulatorCommandHandler } from './simulator/command-handler.js';

export type SimulatorConfig = {
  backendUrl: string;
  machineId: string;
  connectionSecret: string;
  heartbeatIntervalMs: number;
  failureMode: ReturnType<typeof parseFailureMode>;
  machineKind: 'SIMULATOR' | 'HARDWARE';
};

/**
 * WebSocket client that connects to the backend /ws/machine endpoint as a machine peer.
 */
export class SimulatorClient {
  private ws: WebSocket | null = null;
  private handler: SimulatorCommandHandler | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly config: SimulatorConfig) {}

  connect(): void {
    const url = `${this.config.backendUrl.replace(/\/$/, '')}/ws/machine`;
    this.ws = new WebSocket(url, {
      headers: {
        'X-Machine-Id': this.config.machineId,
        'X-Machine-Secret': this.config.connectionSecret,
        'X-Protocol-Version': '1.0',
      },
    });

    this.ws.on('open', () => {
      console.log('[simulator] connected to backend as machine peer');
      this.handler = new SimulatorCommandHandler(
        this.config.machineId,
        {
          send: (message) => {
            if (this.ws?.readyState === WebSocket.OPEN) {
              this.ws.send(JSON.stringify(message));
            }
          },
          schedule: (fn, delayMs) => setTimeout(fn, delayMs),
        },
        this.config.failureMode,
        { machineKind: this.config.machineKind },
      );

      if (this.config.failureMode === 'emergency_stop') {
        setTimeout(() => this.handler?.triggerEmergencyStop(), 500);
      }

      this.heartbeatTimer = this.handler.startHeartbeat(this.config.heartbeatIntervalMs);
    });

    this.ws.on('message', (data: RawData) => {
      this.handler?.handleWireMessage(webSocketDataToString(data));
    });

    this.ws.on('close', () => {
      console.log('[simulator] disconnected from backend');
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
      }
      if (this.config.failureMode !== 'connection_loss') {
        this.reconnectTimer = setTimeout(() => {
          this.connect();
        }, 2000);
      }
    });

    this.ws.on('error', (error: Error) => {
      console.error('[simulator] websocket error:', error.message);
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    this.ws?.close();
  }
}

export function loadSimulatorConfig(): SimulatorConfig {
  const backendUrl = process.env['SIMULATOR_BACKEND_URL'] ?? 'http://127.0.0.1:4000';
  const machineId = process.env['SIMULATOR_MACHINE_ID'] ?? '22222222-2222-4222-8222-222222222222';
  const connectionSecret = process.env['SIMULATOR_CONNECTION_SECRET'] ?? 'dev-simulator-secret-001';
  const heartbeatIntervalMs = Number(process.env['SIMULATOR_HEARTBEAT_MS'] ?? 5000);
  const failureMode = parseFailureMode(process.env['SIMULATOR_FAILURE_MODE']);
  const machineKind =
    process.env['SIMULATOR_MACHINE_KIND'] === 'HARDWARE' ? 'HARDWARE' : 'SIMULATOR';

  return {
    backendUrl: backendUrl.replace(/^http/i, 'ws'),
    machineId,
    connectionSecret,
    heartbeatIntervalMs,
    failureMode,
    machineKind,
  };
}
