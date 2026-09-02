import { z } from 'zod';
import { EntityIdSchema, TimestampSchema } from '../common/primitives.js';

export const CalibrationProfileStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']);

/** Admin-facing calibration profile summary — no secrets in data preview. */
export const CalibrationProfileSummarySchema = z.object({
  profile_id: EntityIdSchema,
  machine_id: EntityIdSchema,
  calibration_type: z.string().min(1).max(50),
  version: z.number().int().positive(),
  status: CalibrationProfileStatusSchema,
  is_simulation: z.boolean().describe('True when profile uses simulation-only calibration data'),
  notes: z.string().max(500).nullable().optional(),
  created_by: EntityIdSchema.nullable().optional(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
});

export const CalibrationProfileDetailSchema = CalibrationProfileSummarySchema.extend({
  data: z.record(z.unknown()).describe('Calibration configuration map — structure varies by type'),
});

export const CreateCalibrationProfileRequestSchema = z.object({
  calibration_type: z.string().min(1).max(50),
  data: z.record(z.unknown()),
  notes: z.string().max(500).optional(),
});

export const UpdateCalibrationProfileRequestSchema = z.object({
  data: z.record(z.unknown()).optional(),
  notes: z.string().max(500).optional(),
});

export type CalibrationProfileSummary = z.infer<typeof CalibrationProfileSummarySchema>;
export type CalibrationProfileDetail = z.infer<typeof CalibrationProfileDetailSchema>;
export type CreateCalibrationProfileRequest = z.infer<typeof CreateCalibrationProfileRequestSchema>;
export type UpdateCalibrationProfileRequest = z.infer<typeof UpdateCalibrationProfileRequestSchema>;
