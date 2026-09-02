import { z } from 'zod';
import { CommandIdSchema, EntityIdSchema, TimestampSchema } from '../common/primitives.js';
import { ProtocolVersionSchema } from '../common/protocol.js';
import { MachineFaultCodeSchema } from '../errors/fault.js';

/**
 * Acknowledgement from machine peer after receiving a command.
 * Use structured error_code — not only human-readable reason strings.
 */
export const CommandAcknowledgementSchema = z.object({
  command_id: CommandIdSchema,
  machine_id: EntityIdSchema,
  protocol_version: ProtocolVersionSchema,
  timestamp: TimestampSchema,
  accepted: z.boolean(),
  error_code: MachineFaultCodeSchema.nullable().describe(
    'Stable fault/error code when accepted is false',
  ),
  message: z.string().max(500).nullable().describe('Human-readable detail for logs/UI'),
});

export type CommandAcknowledgement = z.infer<typeof CommandAcknowledgementSchema>;
