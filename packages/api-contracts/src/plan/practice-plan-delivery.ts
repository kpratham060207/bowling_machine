import { z } from 'zod';
import { CreateSessionDeliveryInputSchema } from '../session/create-session-request.js';

/**
 * High-level delivery definition within a practice plan.
 * Mirrors session delivery input — no machine-calculated parameters.
 */
export const PracticePlanDeliverySchema = CreateSessionDeliveryInputSchema.extend({
  sequence_number: z.number().int().positive(),
});

export type PracticePlanDelivery = z.infer<typeof PracticePlanDeliverySchema>;
