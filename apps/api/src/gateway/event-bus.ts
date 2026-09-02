import type { WebSocketEvent } from '@bowling-machine/api-contracts';

export type MachineEventListener = (event: WebSocketEvent) => void;
export type MachineScopedListener = (machineId: string, event: WebSocketEvent) => void;

/**
 * In-process pub/sub for machine domain events.
 * Browser WebSocket handlers subscribe with machine access filtering applied upstream.
 */
export class MachineEventBus {
  private readonly globalListeners = new Set<MachineEventListener>();
  private readonly machineListeners = new Map<string, Set<MachineEventListener>>();

  subscribe(listener: MachineEventListener): () => void {
    this.globalListeners.add(listener);
    return () => this.globalListeners.delete(listener);
  }

  subscribeToMachine(machineId: string, listener: MachineEventListener): () => void {
    const set = this.machineListeners.get(machineId) ?? new Set();
    set.add(listener);
    this.machineListeners.set(machineId, set);
    return () => {
      set.delete(listener);
      if (set.size === 0) {
        this.machineListeners.delete(machineId);
      }
    };
  }

  publish(event: WebSocketEvent): void {
    for (const listener of this.globalListeners) {
      listener(event);
    }

    const machineId = extractMachineId(event);
    if (machineId) {
      const scoped = this.machineListeners.get(machineId);
      if (scoped) {
        for (const listener of scoped) {
          listener(event);
        }
      }
    }
  }
}

function extractMachineId(event: WebSocketEvent): string | undefined {
  switch (event.event_type) {
    case 'MACHINE_CONNECTED':
    case 'MACHINE_DISCONNECTED':
    case 'MACHINE_STATE_CHANGED':
    case 'EMERGENCY_STOP':
      return event.payload.machine_id;
    case 'COMMAND_ACKNOWLEDGED':
      return event.payload.machine_id;
    case 'FAULT':
      return event.payload.fault.machine_id;
    case 'HEARTBEAT':
      return event.payload.machine_id;
    case 'STATUS_UPDATED':
      return event.payload.status.machine_id;
    case 'DELIVERY_STARTED':
    case 'DELIVERY_COMPLETED':
    case 'DELIVERY_FAILED':
      return event.payload.machine_id;
    case 'SESSION_STARTED':
    case 'SESSION_COMPLETED':
      return event.payload.machine_id;
    default:
      return undefined;
  }
}

export function extractPlayerIdFromEvent(event: WebSocketEvent): string | undefined {
  switch (event.event_type) {
    case 'DELIVERY_STARTED':
    case 'DELIVERY_COMPLETED':
    case 'DELIVERY_FAILED':
      return event.payload.player_id;
    case 'SESSION_STARTED':
    case 'SESSION_COMPLETED':
      return event.payload.player_id;
    default:
      return undefined;
  }
}
