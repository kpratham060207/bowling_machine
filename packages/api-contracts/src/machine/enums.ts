import { z } from 'zod';

/** Administrative registration status of a machine in the backend registry. */
export const MachineRegistryStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']);

/** Transport-level connection status between backend and machine peer. */
export const MachineConnectionStatusSchema = z.enum([
  'DISCONNECTED',
  'CONNECTING',
  'CONNECTED',
  'RECONNECTING',
]);

/** Whether the peer is the software simulator or real ESP32 hardware. */
export const MachineKindSchema = z.enum(['SIMULATOR', 'HARDWARE']);

export const FeederStatusSchema = z.enum([
  'IDLE',
  'READY',
  'FEEDING',
  'JAMMED',
  'FAULT',
  'UNKNOWN',
]);

export const HomingStatusSchema = z.enum(['UNKNOWN', 'NOT_HOMED', 'HOMING', 'HOMED', 'FAULT']);

export type MachineRegistryStatus = z.infer<typeof MachineRegistryStatusSchema>;
export type MachineConnectionStatus = z.infer<typeof MachineConnectionStatusSchema>;
export type MachineKind = z.infer<typeof MachineKindSchema>;
export type FeederStatus = z.infer<typeof FeederStatusSchema>;
export type HomingStatus = z.infer<typeof HomingStatusSchema>;
