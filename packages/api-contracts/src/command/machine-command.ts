import { z } from 'zod';
import { CommandMetadataSchema } from './metadata.js';
import {
  SetConfigurationPayloadSchema,
  StopPayloadSchema,
  ThrowSequencePayloadSchema,
} from './payloads.js';

const EmptyPayloadSchema = z.object({}).strict();

/** Discriminated union of machine commands — transport-independent domain objects. */
export const MachineCommandSchema = z.discriminatedUnion('command_type', [
  CommandMetadataSchema.extend({
    command_type: z.literal('PING'),
    payload: EmptyPayloadSchema,
  }),
  CommandMetadataSchema.extend({
    command_type: z.literal('STATUS'),
    payload: EmptyPayloadSchema,
  }),
  CommandMetadataSchema.extend({
    command_type: z.literal('HOME'),
    payload: EmptyPayloadSchema,
  }),
  CommandMetadataSchema.extend({
    command_type: z.literal('STOP'),
    payload: StopPayloadSchema,
  }),
  CommandMetadataSchema.extend({
    command_type: z.literal('PAUSE'),
    payload: EmptyPayloadSchema,
  }),
  CommandMetadataSchema.extend({
    command_type: z.literal('RESUME'),
    payload: EmptyPayloadSchema,
  }),
  CommandMetadataSchema.extend({
    command_type: z.literal('SET_CONFIGURATION'),
    payload: SetConfigurationPayloadSchema,
  }),
  CommandMetadataSchema.extend({
    command_type: z.literal('THROW_SEQUENCE'),
    payload: ThrowSequencePayloadSchema,
  }),
]);

export type MachineCommand = z.infer<typeof MachineCommandSchema>;
