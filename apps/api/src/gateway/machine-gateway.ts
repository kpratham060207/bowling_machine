import { randomUUID } from 'node:crypto';
import {
  WireCommandDispatchSchema,
  WireInboundMessageSchema,
  isSupportedProtocolVersion,
  type CommandAcknowledgement,
  type MachineCommand,
  type MachineKind,
  type MachineStatus,
  type WebSocketEvent,
} from '@bowling-machine/api-contracts';
import { createDefaultMachineStatus } from '../services/machine.service.js';
import { nowIso } from '../lib/machine-crypto.js';
import type { MachineEventBus } from './event-bus.js';
import type { MachineGateway, MachinePeerConnection, PendingCommand } from './types.js';

/**
 * Default machine gateway — manages in-memory peer connections and wire protocol I/O.
 *
 * Connection lifecycle (per machine peer):
 * DISCONNECTED → CONNECTING (auth handshake) → CONNECTED
 * Heartbeat miss → RECONNECTING → DISCONNECTED if peer does not return
 *
 * Acknowledgement semantics:
 * - sendCommand registers a pending ack keyed by command_id
 * - command.ack wire message resolves or rejects the pending promise
 * - HTTP/API success is separate from machine acknowledgement (handled in command service)
 *
 * Idempotency:
 * - processedCommandIds prevents duplicate side effects if peer retries the same command_id
 * - authoritative idempotency remains in machine_commands table (command_id PK)
 */
export class DefaultMachineGateway implements MachineGateway {
  private readonly peers = new Map<string, MachinePeerConnection>();
  private readonly eventListeners = new Set<(event: WebSocketEvent) => void>();
  private readonly defaultKinds = new Map<string, MachineKind>();

  constructor(
    private readonly eventBus: MachineEventBus,
    private readonly heartbeatTimeoutMs: number,
  ) {
    setInterval(
      () => {
        this.checkHeartbeats();
      },
      Math.max(1000, Math.floor(heartbeatTimeoutMs / 3)),
    );
  }

  onEvent(listener: (event: WebSocketEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  registerMachineKind(machineId: string, kind: MachineKind): void {
    this.defaultKinds.set(machineId, kind);
  }

  getMachineStatus(machineId: string): MachineStatus {
    const peer = this.peers.get(machineId);
    if (peer) {
      return peer.status;
    }
    const kind = this.defaultKinds.get(machineId) ?? 'SIMULATOR';
    return createDefaultMachineStatus(machineId, kind);
  }

  isMachineConnected(machineId: string): boolean {
    const peer = this.peers.get(machineId);
    return peer?.connectionStatus === 'CONNECTED';
  }

  listConnectedMachineIds(): string[] {
    return [...this.peers.entries()]
      .filter(([, peer]) => peer.connectionStatus === 'CONNECTED')
      .map(([machineId]) => machineId);
  }

  attachPeer(
    machineId: string,
    kind: MachineKind,
    send: (message: string) => void,
  ): MachinePeerConnection {
    const existing = this.peers.get(machineId);
    if (existing) {
      existing.send = send;
      existing.connectionStatus = 'CONNECTED';
      return existing;
    }

    const peer: MachinePeerConnection = {
      machineId,
      connectionStatus: 'CONNECTING',
      status: {
        ...createDefaultMachineStatus(machineId, kind),
        connection_status: 'CONNECTING',
        state: 'INITIALIZING',
      },
      lastHeartbeatAt: nowIso(),
      pendingCommands: new Map(),
      processedCommandIds: new Set(),
      send,
    };

    this.peers.set(machineId, peer);
    this.defaultKinds.set(machineId, kind);
    peer.connectionStatus = 'CONNECTED';
    peer.status.connection_status = 'CONNECTED';

    this.emit(
      this.buildEvent('MACHINE_CONNECTED', {
        machine_id: machineId,
        kind,
      }),
    );

    return peer;
  }

  detachPeer(machineId: string, reason?: string): void {
    const peer = this.peers.get(machineId);
    if (!peer) {
      return;
    }

    for (const pending of peer.pendingCommands.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Machine disconnected'));
    }
    peer.pendingCommands.clear();
    peer.connectionStatus = 'DISCONNECTED';
    peer.status.connection_status = 'DISCONNECTED';
    peer.status.state = 'OFF';
    this.peers.delete(machineId);

    this.emit(
      this.buildEvent('MACHINE_DISCONNECTED', {
        machine_id: machineId,
        last_seen: peer.lastHeartbeatAt ?? undefined,
        reason,
      }),
    );
  }

  handleInboundMessage(machineId: string, raw: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.sendWireError(machineId, 'Invalid JSON payload');
      return;
    }

    const result = WireInboundMessageSchema.safeParse(parsed);
    if (!result.success) {
      this.sendWireError(machineId, 'Malformed or unsupported wire message');
      return;
    }

    const message = result.data;
    const peer = this.peers.get(machineId);
    if (!peer) {
      return;
    }

    if (
      message.type === 'command.ack' &&
      !isSupportedProtocolVersion(message.payload.protocol_version)
    ) {
      this.sendWireError(
        machineId,
        `Unsupported protocol version: ${String(message.payload.protocol_version)}`,
      );
      return;
    }

    switch (message.type) {
      case 'heartbeat':
        peer.lastHeartbeatAt = message.payload.timestamp;
        peer.send(
          JSON.stringify({
            type: 'heartbeat_ack',
            id: randomUUID(),
            timestamp: nowIso(),
            payload: { machine_id: machineId, timestamp: nowIso() },
          }),
        );
        this.emit(this.buildEvent('HEARTBEAT', message.payload));
        break;
      case 'command.ack':
        this.resolvePendingCommand(peer, message.payload);
        this.emit(this.buildEvent('COMMAND_ACKNOWLEDGED', message.payload));
        break;
      case 'telemetry.status':
        peer.status = message.payload;
        this.emit(this.buildEvent('STATUS_UPDATED', { status: message.payload }));
        break;
      case 'event.state_changed':
        peer.status.state = message.payload.new_state;
        peer.status.timestamp = message.payload.timestamp;
        this.emit(this.buildEvent('MACHINE_STATE_CHANGED', message.payload));
        break;
      case 'event.fault':
        peer.status.active_fault = message.payload.fault;
        this.emit(this.buildEvent('FAULT', message.payload));
        break;
      case 'event.emergency_stop':
        peer.status.emergency_stop_active = message.payload.active;
        peer.status.state = message.payload.active ? 'EMERGENCY_STOP' : peer.status.state;
        this.emit(this.buildEvent('EMERGENCY_STOP', message.payload));
        break;
      default:
        break;
    }
  }

  async sendCommand(
    command: MachineCommand,
    ackTimeoutMs: number,
  ): Promise<CommandAcknowledgement> {
    const peer = this.peers.get(command.machine_id);
    if (!peer || peer.connectionStatus !== 'CONNECTED') {
      throw new Error('Machine peer is not connected');
    }

    if (peer.processedCommandIds.has(command.command_id)) {
      return {
        command_id: command.command_id,
        machine_id: command.machine_id,
        protocol_version: command.protocol_version,
        timestamp: nowIso(),
        accepted: true,
        error_code: null,
        message: 'Duplicate command_id — already processed by gateway',
      };
    }

    const wire = WireCommandDispatchSchema.parse({
      type: 'command.dispatch',
      id: randomUUID(),
      timestamp: nowIso(),
      payload: command,
    });

    return new Promise<CommandAcknowledgement>((resolve, reject) => {
      const timeout = setTimeout(() => {
        peer.pendingCommands.delete(command.command_id);
        reject(new Error('Command acknowledgement timeout'));
      }, ackTimeoutMs);

      const pending: PendingCommand = {
        commandId: command.command_id,
        resolve: (ack) => {
          peer.processedCommandIds.add(command.command_id);
          resolve(ack);
        },
        reject,
        timeout,
      };

      peer.pendingCommands.set(command.command_id, pending);
      peer.send(JSON.stringify(wire));
    });
  }

  private sendWireError(machineId: string, message: string): void {
    const peer = this.peers.get(machineId);
    if (!peer) {
      return;
    }
    peer.send(
      JSON.stringify({
        type: 'error',
        id: randomUUID(),
        timestamp: nowIso(),
        payload: { machine_id: machineId, message },
      }),
    );
  }

  private resolvePendingCommand(peer: MachinePeerConnection, ack: CommandAcknowledgement): void {
    const pending = peer.pendingCommands.get(ack.command_id);
    if (!pending) {
      return;
    }
    clearTimeout(pending.timeout);
    peer.pendingCommands.delete(ack.command_id);
    pending.resolve(ack);
  }

  private checkHeartbeats(): void {
    for (const [machineId, peer] of this.peers.entries()) {
      if (!peer.lastHeartbeatAt) {
        continue;
      }
      const elapsed = Date.now() - new Date(peer.lastHeartbeatAt).getTime();
      if (elapsed > this.heartbeatTimeoutMs && peer.connectionStatus === 'CONNECTED') {
        peer.connectionStatus = 'RECONNECTING';
        peer.status.connection_status = 'RECONNECTING';
        if (elapsed > this.heartbeatTimeoutMs * 2) {
          this.detachPeer(machineId, 'heartbeat_timeout');
        }
      }
    }
  }

  private emit(event: WebSocketEvent): void {
    for (const listener of this.eventListeners) {
      listener(event);
    }
    this.eventBus.publish(event);
  }

  private buildEvent<T extends WebSocketEvent['event_type']>(
    eventType: T,
    payload: Extract<WebSocketEvent, { event_type: T }>['payload'],
  ): WebSocketEvent {
    return {
      event_id: randomUUID(),
      event_type: eventType,
      timestamp: nowIso(),
      payload,
    } as WebSocketEvent;
  }
}
