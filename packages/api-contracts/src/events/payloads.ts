import { z } from 'zod';
import { EntityIdSchema, TimestampSchema } from '../common/primitives.js';
import { DeliveryStatusSchema } from '../delivery/delivery.js';
import { MachineStateSchema } from '../machine/state.js';
import { MachineFaultSchema } from '../errors/fault.js';
import { MachineStatusSchema } from '../machine/status.js';
import { SessionStatusSchema } from '../session/session.js';

export const MachineConnectedPayloadSchema = z.object({
  machine_id: EntityIdSchema,
  firmware_version: z.string().max(50).optional(),
  kind: z.enum(['SIMULATOR', 'HARDWARE']),
});

export const MachineDisconnectedPayloadSchema = z.object({
  machine_id: EntityIdSchema,
  last_seen: TimestampSchema.optional(),
  reason: z.string().max(200).optional(),
});

export const MachineStateChangedPayloadSchema = z.object({
  machine_id: EntityIdSchema,
  previous_state: MachineStateSchema,
  new_state: MachineStateSchema,
});

export const DeliveryLifecyclePayloadSchema = z.object({
  session_id: EntityIdSchema,
  delivery_id: EntityIdSchema,
  sequence_number: z.number().int().positive(),
  status: DeliveryStatusSchema.optional(),
});

export const SessionLifecyclePayloadSchema = z.object({
  session_id: EntityIdSchema,
  player_id: EntityIdSchema.optional(),
  machine_id: EntityIdSchema.optional(),
  status: SessionStatusSchema.optional(),
  total_balls_delivered: z.number().int().nonnegative().optional(),
  duration_ms: z.number().int().nonnegative().optional(),
});

export const FaultEventPayloadSchema = z.object({
  fault: MachineFaultSchema,
});

export const EmergencyStopPayloadSchema = z.object({
  machine_id: EntityIdSchema,
  active: z.boolean(),
  fault: MachineFaultSchema.optional(),
});

export const StatusUpdatedPayloadSchema = z.object({
  status: MachineStatusSchema,
});

export type MachineConnectedPayload = z.infer<typeof MachineConnectedPayloadSchema>;
export type MachineDisconnectedPayload = z.infer<typeof MachineDisconnectedPayloadSchema>;
export type MachineStateChangedPayload = z.infer<typeof MachineStateChangedPayloadSchema>;
export type DeliveryLifecyclePayload = z.infer<typeof DeliveryLifecyclePayloadSchema>;
export type SessionLifecyclePayload = z.infer<typeof SessionLifecyclePayloadSchema>;
export type FaultEventPayload = z.infer<typeof FaultEventPayloadSchema>;
export type EmergencyStopPayload = z.infer<typeof EmergencyStopPayloadSchema>;
export type StatusUpdatedPayload = z.infer<typeof StatusUpdatedPayloadSchema>;
