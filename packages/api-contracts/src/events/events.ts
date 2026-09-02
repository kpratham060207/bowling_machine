import { z } from 'zod';
import { CommandAcknowledgementSchema } from '../command/command-ack.js';
import { MachineHeartbeatSchema } from '../machine/connection.js';
import { EventEnvelopeBaseSchema } from './envelope.js';
import {
  DeliveryLifecyclePayloadSchema,
  EmergencyStopPayloadSchema,
  FaultEventPayloadSchema,
  MachineConnectedPayloadSchema,
  MachineDisconnectedPayloadSchema,
  MachineStateChangedPayloadSchema,
  SessionLifecyclePayloadSchema,
  StatusUpdatedPayloadSchema,
} from './payloads.js';

/**
 * Discriminated union of all WebSocket domain events.
 * Extensible: new event types add a new variant without breaking existing consumers.
 */
export const WebSocketEventSchema = z.discriminatedUnion('event_type', [
  EventEnvelopeBaseSchema.extend({
    event_type: z.literal('MACHINE_CONNECTED'),
    payload: MachineConnectedPayloadSchema,
  }),
  EventEnvelopeBaseSchema.extend({
    event_type: z.literal('MACHINE_DISCONNECTED'),
    payload: MachineDisconnectedPayloadSchema,
  }),
  EventEnvelopeBaseSchema.extend({
    event_type: z.literal('MACHINE_STATE_CHANGED'),
    payload: MachineStateChangedPayloadSchema,
  }),
  EventEnvelopeBaseSchema.extend({
    event_type: z.literal('COMMAND_ACKNOWLEDGED'),
    payload: CommandAcknowledgementSchema,
  }),
  EventEnvelopeBaseSchema.extend({
    event_type: z.literal('DELIVERY_STARTED'),
    payload: DeliveryLifecyclePayloadSchema,
  }),
  EventEnvelopeBaseSchema.extend({
    event_type: z.literal('DELIVERY_COMPLETED'),
    payload: DeliveryLifecyclePayloadSchema,
  }),
  EventEnvelopeBaseSchema.extend({
    event_type: z.literal('DELIVERY_FAILED'),
    payload: DeliveryLifecyclePayloadSchema,
  }),
  EventEnvelopeBaseSchema.extend({
    event_type: z.literal('SESSION_STARTED'),
    payload: SessionLifecyclePayloadSchema,
  }),
  EventEnvelopeBaseSchema.extend({
    event_type: z.literal('SESSION_COMPLETED'),
    payload: SessionLifecyclePayloadSchema,
  }),
  EventEnvelopeBaseSchema.extend({
    event_type: z.literal('FAULT'),
    payload: FaultEventPayloadSchema,
  }),
  EventEnvelopeBaseSchema.extend({
    event_type: z.literal('EMERGENCY_STOP'),
    payload: EmergencyStopPayloadSchema,
  }),
  EventEnvelopeBaseSchema.extend({
    event_type: z.literal('HEARTBEAT'),
    payload: MachineHeartbeatSchema,
  }),
  EventEnvelopeBaseSchema.extend({
    event_type: z.literal('STATUS_UPDATED'),
    payload: StatusUpdatedPayloadSchema,
  }),
]);

export type WebSocketEvent = z.infer<typeof WebSocketEventSchema>;
