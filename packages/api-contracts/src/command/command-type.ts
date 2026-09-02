import { z } from 'zod';

/**
 * Transport-independent machine command types.
 * Domain/protocol objects — not HTTP routes or wire-level message type strings.
 */
export const MachineCommandTypeSchema = z.enum([
  'PING',
  'STATUS',
  'HOME',
  'STOP',
  'PAUSE',
  'RESUME',
  'SET_CONFIGURATION',
  'THROW_SEQUENCE',
]);

export type MachineCommandType = z.infer<typeof MachineCommandTypeSchema>;
