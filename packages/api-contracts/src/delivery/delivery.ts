import { z } from 'zod';
import { EntityIdSchema, TimestampSchema } from '../common/primitives.js';
import { CommandIdSchema } from '../common/primitives.js';
import { MachineFaultSchema } from '../errors/fault.js';
import { DeliveryRequestSchema } from './delivery-request.js';
import { MachineDeliveryParametersSchema } from './machine-parameters.js';

export const DeliveryStatusSchema = z.enum([
  'PENDING',
  'EXECUTING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);

/**
 * Measured/actual values after delivery — optional because sensing is not implemented.
 * Populated from telemetry when available.
 */
export const DeliveryMeasuredValuesSchema = z
  .object({
    wheel1_actual_rpm: z.number().nonnegative().nullable().optional(),
    wheel2_actual_rpm: z.number().nonnegative().nullable().optional(),
    landed_at: TimestampSchema.optional(),
  })
  .optional()
  .describe('Post-delivery measurements — nullable until hardware telemetry exists');

export const DeliverySchema = z.object({
  delivery_id: EntityIdSchema,
  session_id: EntityIdSchema,
  sequence_number: z.number().int().positive(),
  requested: DeliveryRequestSchema.describe('Original user-level request'),
  calculated_parameters: MachineDeliveryParametersSchema.nullable().describe(
    'Machine params from calculation engine; null while pending',
  ),
  command_id: CommandIdSchema.nullable(),
  status: DeliveryStatusSchema,
  error: MachineFaultSchema.nullable().optional(),
  measured: DeliveryMeasuredValuesSchema,
  /** Calibration profile used at calculation time — preserved for debugging and future AI linkage. */
  calibration_profile_id: EntityIdSchema.nullable().optional(),
  created_at: TimestampSchema,
  executed_at: TimestampSchema.nullable().optional(),
});

export type DeliveryStatus = z.infer<typeof DeliveryStatusSchema>;
export type Delivery = z.infer<typeof DeliverySchema>;
export type DeliveryMeasuredValues = z.infer<typeof DeliveryMeasuredValuesSchema>;
