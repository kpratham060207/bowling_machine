import { z } from 'zod';
import { EntityIdSchema, TimestampSchema } from '../common/primitives.js';
import { ProtocolVersionSchema } from '../common/protocol.js';
import { MachineKindSchema, MachineRegistryStatusSchema } from './enums.js';

/** Static machine identity — does not include live telemetry. */
export const MachineIdentitySchema = z.object({
  machine_id: EntityIdSchema,
  name: z.string().min(1).max(100).describe('Human-readable machine label'),
  serial_number: z.string().min(1).max(50).optional(),
  registry_status: MachineRegistryStatusSchema,
  kind: MachineKindSchema.describe('SIMULATOR vs real ESP32 hardware'),
  protocol_version: ProtocolVersionSchema,
  firmware_version: z.string().max(50).optional(),
  created_at: TimestampSchema.optional(),
  updated_at: TimestampSchema.optional(),
});

export type MachineIdentity = z.infer<typeof MachineIdentitySchema>;
