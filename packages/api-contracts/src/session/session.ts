import { z } from 'zod';
import { EntityIdSchema, TimestampSchema } from '../common/primitives.js';
import { DeliverySchema } from '../delivery/delivery.js';

export const SessionStatusSchema = z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']);

export const PracticeSessionSchema = z.object({
  session_id: EntityIdSchema,
  player_id: EntityIdSchema,
  machine_id: EntityIdSchema,
  status: SessionStatusSchema,
  deliveries: z.array(DeliverySchema).describe('Ordered delivery sequence'),
  started_at: TimestampSchema,
  ended_at: TimestampSchema.nullable().optional(),
  total_balls_planned: z.number().int().nonnegative(),
  total_balls_delivered: z.number().int().nonnegative(),
});

export const SessionSummarySchema = z.object({
  session_id: EntityIdSchema,
  status: SessionStatusSchema,
  total_balls_planned: z.number().int().nonnegative(),
  total_balls_delivered: z.number().int().nonnegative(),
  started_at: TimestampSchema,
  ended_at: TimestampSchema.nullable().optional(),
  duration_ms: z.number().int().nonnegative().nullable().optional(),
});

export type SessionStatus = z.infer<typeof SessionStatusSchema>;
export type PracticeSession = z.infer<typeof PracticeSessionSchema>;
export type SessionSummary = z.infer<typeof SessionSummarySchema>;
