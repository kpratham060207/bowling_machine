import { z } from 'zod';

/** Cursor-based pagination request parameters for list endpoints. */
export const PaginationRequestSchema = z.object({
  cursor: z.string().optional().describe('Opaque cursor from a previous page'),
  limit: z
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must not exceed 100')
    .default(20),
});

export const PaginationMetaSchema = z.object({
  next_cursor: z.string().nullable(),
  has_more: z.boolean(),
});

export type PaginationRequest = z.infer<typeof PaginationRequestSchema>;
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;
