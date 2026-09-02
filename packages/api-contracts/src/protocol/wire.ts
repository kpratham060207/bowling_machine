import { z } from 'zod';
import { CommandAcknowledgementSchema } from '../command/command-ack.js';
import { MachineCommandSchema } from '../command/machine-command.js';
import { MachineHeartbeatSchema } from '../machine/connection.js';
import { MachineStatusSchema } from '../machine/status.js';
import { EntityIdSchema, TimestampSchema } from '../common/primitives.js';
import { MachineStateSchema } from '../machine/state.js';
import { MachineFaultSchema } from '../errors/fault.js';

/**
 * Provisional wire envelope for backend ↔ machine peer WebSocket messages.
 * Domain semantics remain in api-contracts; this layer is transport encoding only.
 */
export const WireEnvelopeSchema = z.object({
  type: z.string().min(1).max(64),
  id: EntityIdSchema,
  timestamp: TimestampSchema,
  payload: z.unknown(),
});

/** Backend dispatches a full domain command to the machine peer. */
export const WireCommandDispatchSchema = WireEnvelopeSchema.extend({
  type: z.literal('command.dispatch'),
  payload: MachineCommandSchema,
});

export const WireCommandAckSchema = WireEnvelopeSchema.extend({
  type: z.literal('command.ack'),
  payload: CommandAcknowledgementSchema,
});

export const WireHeartbeatSchema = WireEnvelopeSchema.extend({
  type: z.literal('heartbeat'),
  payload: MachineHeartbeatSchema,
});

export const WireHeartbeatAckSchema = WireEnvelopeSchema.extend({
  type: z.literal('heartbeat_ack'),
  payload: z.object({
    machine_id: EntityIdSchema,
    timestamp: TimestampSchema,
  }),
});

export const WireTelemetryStatusSchema = WireEnvelopeSchema.extend({
  type: z.literal('telemetry.status'),
  payload: MachineStatusSchema,
});

export const WireStateChangedSchema = WireEnvelopeSchema.extend({
  type: z.literal('event.state_changed'),
  payload: z.object({
    machine_id: EntityIdSchema,
    previous_state: MachineStateSchema,
    new_state: MachineStateSchema,
    timestamp: TimestampSchema,
  }),
});

export const WireFaultSchema = WireEnvelopeSchema.extend({
  type: z.literal('event.fault'),
  payload: z.object({
    fault: MachineFaultSchema,
  }),
});

export const WireEmergencyStopSchema = WireEnvelopeSchema.extend({
  type: z.literal('event.emergency_stop'),
  payload: z.object({
    machine_id: EntityIdSchema,
    active: z.boolean(),
    fault: MachineFaultSchema.optional(),
    timestamp: TimestampSchema,
  }),
});

export const WireInboundMessageSchema = z.discriminatedUnion('type', [
  WireCommandAckSchema,
  WireHeartbeatSchema,
  WireTelemetryStatusSchema,
  WireStateChangedSchema,
  WireFaultSchema,
  WireEmergencyStopSchema,
]);

export type WireEnvelope = z.infer<typeof WireEnvelopeSchema>;
export type WireCommandDispatch = z.infer<typeof WireCommandDispatchSchema>;
export type WireInboundMessage = z.infer<typeof WireInboundMessageSchema>;
