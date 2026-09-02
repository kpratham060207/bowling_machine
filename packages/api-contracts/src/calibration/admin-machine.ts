import { z } from 'zod';
import { MachineConnectionStatusSchema, MachineKindSchema } from '../machine/enums.js';
import { MachineStateSchema } from '../machine/state.js';
import { EntityIdSchema, TimestampSchema } from '../common/primitives.js';
import { MachineFaultSchema } from '../errors/fault.js';
import { CalibrationProfileSummarySchema } from './admin-calibration.js';

/** ADMIN machine detail — live connectivity and operational snapshot (no secrets). */
export const AdminMachineDetailSchema = z.object({
  machine_id: EntityIdSchema,
  name: z.string(),
  serial_number: z.string(),
  kind: MachineKindSchema,
  registry_status: z.string(),
  protocol_version: z.string(),
  last_known_firmware_version: z.string().nullable(),
  connection_status: MachineConnectionStatusSchema,
  machine_state: MachineStateSchema,
  is_connected: z.boolean(),
  last_heartbeat_at: TimestampSchema.nullable(),
  active_calibration: CalibrationProfileSummarySchema.nullable(),
  active_fault: MachineFaultSchema.nullable(),
  emergency_stop_active: z.boolean(),
});

export type AdminMachineDetail = z.infer<typeof AdminMachineDetailSchema>;

/** One-time response when ADMIN creates or rotates machine peer credentials. */
export const MachineRegistrationSecretSchema = z.object({
  machine_id: EntityIdSchema,
  qr_code_token: z.string(),
  /** Plaintext connection secret — returned once, never stored or logged by the API. */
  connection_secret: z.string(),
  created_at: TimestampSchema,
});

export type MachineRegistrationSecret = z.infer<typeof MachineRegistrationSecretSchema>;
