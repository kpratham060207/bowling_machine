import { z } from 'zod';
import { EntityIdSchema, TimestampSchema } from '../common/primitives.js';
import { CreateSessionDeliveryInputSchema } from '../session/create-session-request.js';
import { PracticePlanDeliverySchema } from './practice-plan-delivery.js';

export const PracticePlanSchema = z.object({
  plan_id: EntityIdSchema,
  player_id: EntityIdSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  deliveries: z.array(PracticePlanDeliverySchema),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
});

export const CreatePracticePlanRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  deliveries: z.array(CreateSessionDeliveryInputSchema).min(1),
});

export const UpdatePracticePlanRequestSchema = CreatePracticePlanRequestSchema;

export const StartPracticePlanRequestSchema = z.object({
  machine_id: EntityIdSchema,
});

export type PracticePlan = z.infer<typeof PracticePlanSchema>;
export type CreatePracticePlanRequest = z.infer<typeof CreatePracticePlanRequestSchema>;
export type UpdatePracticePlanRequest = z.infer<typeof UpdatePracticePlanRequestSchema>;
export type StartPracticePlanRequest = z.infer<typeof StartPracticePlanRequestSchema>;
