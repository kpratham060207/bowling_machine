import { z } from 'zod';
import { EntityIdSchema, TimestampSchema } from '../common/primitives.js';

/**
 * Consistent WebSocket event envelope — transport-independent domain events.
 *
 * Wire format (e.g. `machine.state_changed`) is mapped by gateway layers;
 * this contract uses SCREAMING_SNAKE event_type values per Phase 1B spec.
 */
export const WebSocketEventTypeSchema = z.enum([
  'MACHINE_CONNECTED',
  'MACHINE_DISCONNECTED',
  'MACHINE_STATE_CHANGED',
  'COMMAND_ACKNOWLEDGED',
  'DELIVERY_STARTED',
  'DELIVERY_COMPLETED',
  'SESSION_STARTED',
  'SESSION_COMPLETED',
  'FAULT',
  'EMERGENCY_STOP',
  'HEARTBEAT',
  'STATUS_UPDATED',
]);

export type WebSocketEventType = z.infer<typeof WebSocketEventTypeSchema>;

/** Base fields present on every typed event envelope. */
export const EventEnvelopeBaseSchema = z.object({
  event_id: EntityIdSchema.describe('Unique event instance ID for deduplication'),
  event_type: WebSocketEventTypeSchema,
  timestamp: TimestampSchema,
  machine_id: EntityIdSchema.optional().describe('Present when event is machine-scoped'),
  session_id: EntityIdSchema.optional().describe('Present when event is session-scoped'),
});

export type EventEnvelopeBase = z.infer<typeof EventEnvelopeBaseSchema>;
