import { randomUUID } from 'node:crypto';
import type { WebSocketEvent } from '@bowling-machine/api-contracts';
import type { MachineEventBus } from '../gateway/event-bus.js';

/**
 * Publishes session/delivery lifecycle events to the machine event bus for browser WebSocket fan-out.
 * Always includes player_id and machine_id so browser handlers can enforce authorization.
 */
export class OrchestrationEventPublisher {
  constructor(private readonly eventBus: MachineEventBus) {}

  publishSessionStarted(input: { sessionId: string; playerId: string; machineId: string }): void {
    this.publish({
      event_id: randomUUID(),
      event_type: 'SESSION_STARTED',
      timestamp: new Date().toISOString(),
      payload: {
        session_id: input.sessionId,
        player_id: input.playerId,
        machine_id: input.machineId,
        status: 'ACTIVE',
      },
    });
  }

  publishSessionCompleted(input: {
    sessionId: string;
    playerId: string;
    machineId: string;
    status: 'COMPLETED' | 'CANCELLED';
    totalBallsDelivered: number;
  }): void {
    this.publish({
      event_id: randomUUID(),
      event_type: 'SESSION_COMPLETED',
      timestamp: new Date().toISOString(),
      payload: {
        session_id: input.sessionId,
        player_id: input.playerId,
        machine_id: input.machineId,
        status: input.status,
        total_balls_delivered: input.totalBallsDelivered,
      },
    });
  }

  publishDeliveryStarted(input: {
    sessionId: string;
    deliveryId: string;
    sequenceNumber: number;
    playerId: string;
    machineId: string;
  }): void {
    this.publish({
      event_id: randomUUID(),
      event_type: 'DELIVERY_STARTED',
      timestamp: new Date().toISOString(),
      payload: {
        session_id: input.sessionId,
        delivery_id: input.deliveryId,
        sequence_number: input.sequenceNumber,
        status: 'EXECUTING',
        player_id: input.playerId,
        machine_id: input.machineId,
      },
    });
  }

  publishDeliveryCompleted(input: {
    sessionId: string;
    deliveryId: string;
    sequenceNumber: number;
    playerId: string;
    machineId: string;
  }): void {
    this.publish({
      event_id: randomUUID(),
      event_type: 'DELIVERY_COMPLETED',
      timestamp: new Date().toISOString(),
      payload: {
        session_id: input.sessionId,
        delivery_id: input.deliveryId,
        sequence_number: input.sequenceNumber,
        status: 'COMPLETED',
        player_id: input.playerId,
        machine_id: input.machineId,
      },
    });
  }

  publishDeliveryFailed(input: {
    sessionId: string;
    deliveryId: string;
    sequenceNumber: number;
    playerId: string;
    machineId: string;
  }): void {
    this.publish({
      event_id: randomUUID(),
      event_type: 'DELIVERY_FAILED',
      timestamp: new Date().toISOString(),
      payload: {
        session_id: input.sessionId,
        delivery_id: input.deliveryId,
        sequence_number: input.sequenceNumber,
        status: 'FAILED',
        player_id: input.playerId,
        machine_id: input.machineId,
      },
    });
  }

  private publish(event: WebSocketEvent): void {
    this.eventBus.publish(event);
  }
}
