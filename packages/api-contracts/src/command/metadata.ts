import { z } from 'zod';
import { CommandIdSchema, EntityIdSchema, TimestampSchema } from '../common/primitives.js';
import { ProtocolVersionSchema } from '../common/protocol.js';
import { MachineCommandTypeSchema } from './command-type.js';

/**
 * Shared metadata on every machine command.
 * Supports TTL via expires_at and future idempotency/replay protection via command_id.
 */
export const CommandMetadataSchema = z.object({
  command_id: CommandIdSchema,
  machine_id: EntityIdSchema,
  protocol_version: ProtocolVersionSchema,
  command_type: MachineCommandTypeSchema,
  issued_at: TimestampSchema.describe('When the backend issued the command'),
  expires_at: TimestampSchema.optional().describe(
    'Command rejected after this time — stale command protection',
  ),
});

export type CommandMetadata = z.infer<typeof CommandMetadataSchema>;
