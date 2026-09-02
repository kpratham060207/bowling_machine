import { z } from 'zod';
import { CommandIdSchema, EntityIdSchema } from '../common/primitives.js';
import { DeliveryRequestSchema } from '../delivery/delivery-request.js';

/**
 * Delivery input when creating a session — machine and session are implied by the parent request.
 */
export const CreateSessionDeliveryInputSchema = DeliveryRequestSchema.omit({
  machine_id: true,
  session_id: true,
});

/**
 * Request body for POST /api/v1/sessions — starts a practice session on an authorized machine.
 */
export const CreateSessionRequestSchema = z.object({
  machine_id: EntityIdSchema,
  deliveries: z.array(CreateSessionDeliveryInputSchema).optional(),
});

/**
 * Request body for POST /api/v1/sessions/:sessionId/deliveries.
 * Optional command_id enables idempotent retries of the same logical throw sequence.
 */
export const CreateDeliveryRequestSchema = CreateSessionDeliveryInputSchema.extend({
  command_id: CommandIdSchema.optional(),
});

export type CreateSessionDeliveryInput = z.infer<typeof CreateSessionDeliveryInputSchema>;
export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;
export type CreateDeliveryRequest = z.infer<typeof CreateDeliveryRequestSchema>;
