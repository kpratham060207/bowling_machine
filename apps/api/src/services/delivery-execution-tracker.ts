import type { WebSocketEvent } from '@bowling-machine/api-contracts';
import type { MachineEventBus } from '../gateway/event-bus.js';
import type { DeliveryOrchestrationService } from './delivery-orchestration.service.js';

/**
 * Subscribes to machine gateway events and forwards completion/fault signals
 * to the delivery orchestration layer — never marks deliveries complete on ack alone.
 */
export class DeliveryExecutionTracker {
  private unsubscribe: (() => void) | null = null;

  constructor(
    private readonly eventBus: MachineEventBus,
    private readonly orchestration: DeliveryOrchestrationService,
  ) {}

  start(): void {
    this.unsubscribe = this.eventBus.subscribe((event) => {
      void this.handleEvent(event);
    });
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private async handleEvent(event: WebSocketEvent): Promise<void> {
    switch (event.event_type) {
      case 'STATUS_UPDATED':
        await this.orchestration.handleMachineStatusUpdate(event.payload.status);
        break;
      case 'FAULT':
        await this.orchestration.handleMachineFault(
          event.payload.fault.machine_id,
          event.payload.fault.message,
        );
        break;
      case 'EMERGENCY_STOP':
        await this.orchestration.handleMachineFault(
          event.payload.machine_id,
          'Emergency stop activated',
        );
        break;
      default:
        break;
    }
  }
}
