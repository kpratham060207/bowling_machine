import { z } from 'zod';
import { EntityIdSchema, TimestampSchema } from '../common/primitives.js';
import { MachineIdentitySchema } from './identity.js';
import { MachineStatusSchema } from './status.js';

/**
 * Player acquires exclusive machine control — one active controller per machine (UD-06 MVP).
 */
export const MachineControlAcquireResponseSchema = z.object({
  machine_id: EntityIdSchema,
  connection_id: EntityIdSchema.describe('Session-scoped control connection identifier'),
  acquired_at: TimestampSchema,
  expires_at: TimestampSchema,
});

export const MachineControlReleaseRequestSchema = z.object({
  connection_id: EntityIdSchema.optional().describe(
    'Must match the active control connection when supplied',
  ),
});

export const MachineControlReleaseResponseSchema = z.object({
  machine_id: EntityIdSchema,
  released_at: TimestampSchema,
});

/** Summary returned when listing machines accessible to the authenticated player. */
export const AccessibleMachineSummarySchema = MachineIdentitySchema.extend({
  has_control: z.boolean().describe('True when this player holds the active control lock'),
  control_expires_at: TimestampSchema.nullable().optional(),
});

export const MachineDetailResponseSchema = z.object({
  machine: MachineIdentitySchema,
  status: MachineStatusSchema.optional(),
  control: z
    .object({
      connection_id: EntityIdSchema,
      acquired_at: TimestampSchema,
      expires_at: TimestampSchema,
      is_owner: z.boolean(),
    })
    .nullable(),
});

export const MachineCommandSubmitResponseSchema = z.object({
  command_id: EntityIdSchema,
  status: z.enum(['DISPATCHED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'FAILED', 'PENDING']),
  acknowledgement: z
    .object({
      accepted: z.boolean(),
      error_code: z.string().nullable(),
      message: z.string().nullable(),
    })
    .optional(),
});

export type MachineControlAcquireResponse = z.infer<typeof MachineControlAcquireResponseSchema>;
export type MachineControlReleaseRequest = z.infer<typeof MachineControlReleaseRequestSchema>;
export type MachineControlReleaseResponse = z.infer<typeof MachineControlReleaseResponseSchema>;
export type AccessibleMachineSummary = z.infer<typeof AccessibleMachineSummarySchema>;
export type MachineDetailResponse = z.infer<typeof MachineDetailResponseSchema>;
export type MachineCommandSubmitResponse = z.infer<typeof MachineCommandSubmitResponseSchema>;
