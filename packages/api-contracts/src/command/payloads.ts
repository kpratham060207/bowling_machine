import { z } from 'zod';
import { EntityIdSchema } from '../common/primitives.js';
import { MachineDeliveryParametersSchema } from '../delivery/machine-parameters.js';

/**
 * THROW_SEQUENCE payload — validated machine instructions for ESP32/simulator.
 *
 * Does NOT contain user UI fields (target_x, ball_type labels, etc.).
 * Backend compiles DeliveryRequest → MachineDeliveryParameters → this payload.
 */
export const ThrowSequencePayloadSchema = z.object({
  sequence_id: EntityIdSchema.describe('Unique identity for this throw sequence'),
  delivery_id: EntityIdSchema.optional().describe('Linked application delivery record'),
  delivery_count: z.number().int().min(1).describe('Number of balls in this sequence'),
  parameters: MachineDeliveryParametersSchema.describe(
    'Machine-level parameters — may contain nulls until calibrated',
  ),
});

export const SetConfigurationPayloadSchema = z.object({
  calibration_type: z.string().min(1).max(50),
  version: z.number().int().positive(),
  data: z.record(z.unknown()).describe('Opaque calibration blob — validated by machine firmware'),
});

export const StopPayloadSchema = z.object({
  reason: z.string().max(200).optional(),
});

export type ThrowSequencePayload = z.infer<typeof ThrowSequencePayloadSchema>;
export type SetConfigurationPayload = z.infer<typeof SetConfigurationPayloadSchema>;
export type StopPayload = z.infer<typeof StopPayloadSchema>;
