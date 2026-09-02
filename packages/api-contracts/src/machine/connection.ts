import { z } from 'zod';
import { EntityIdSchema, TimestampSchema } from '../common/primitives.js';
import { MachineConnectionStatusSchema } from './enums.js';

/** Heartbeat from machine peer to backend — transport-independent semantics. */
export const MachineHeartbeatSchema = z.object({
  machine_id: EntityIdSchema,
  timestamp: TimestampSchema,
  sequence: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe('Optional monotonic heartbeat counter'),
});

/** Result of a player/backend initiating connection to a machine. */
export const MachineConnectionResultSchema = z.object({
  machine_id: EntityIdSchema,
  connection_id: EntityIdSchema.describe('Session-scoped connection identifier'),
  connection_status: MachineConnectionStatusSchema,
  connected_at: TimestampSchema.optional(),
});

/** QR-based machine discovery request (application layer — not HTTP-specific). */
export const MachineDiscoveryRequestSchema = z.object({
  qr_token: z.string().min(16).max(128).describe('Token embedded in machine QR code'),
});

export const MachineDisconnectionSchema = z.object({
  machine_id: EntityIdSchema,
  connection_id: EntityIdSchema.optional(),
  disconnected_at: TimestampSchema,
  reason: z.string().max(200).optional(),
});

export type MachineHeartbeat = z.infer<typeof MachineHeartbeatSchema>;
export type MachineConnectionResult = z.infer<typeof MachineConnectionResultSchema>;
export type MachineDiscoveryRequest = z.infer<typeof MachineDiscoveryRequestSchema>;
export type MachineDisconnection = z.infer<typeof MachineDisconnectionSchema>;
