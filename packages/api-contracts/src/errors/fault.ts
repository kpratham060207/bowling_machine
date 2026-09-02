import { z } from 'zod';
import { EntityIdSchema, TimestampSchema } from '../common/primitives.js';
import { CommandIdSchema } from '../common/primitives.js';

/**
 * Stable machine fault codes — machine-readable, not stack traces.
 * Extend via schema migration when new fault types are discovered on hardware.
 */
export const MachineFaultCodeSchema = z.enum([
  'ACTUATOR_LIMIT',
  'ACTUATOR_TIMEOUT',
  'ENCODER_FAILURE',
  'FEEDER_JAM',
  'RPM_LIMIT_EXCEEDED',
  'RPM_NOT_ACHIEVED',
  'COMMAND_EXPIRED',
  'COMMAND_REJECTED',
  'EMERGENCY_STOP',
  'HOMING_FAILED',
  'IMU_FAILURE',
  'POWER_FAULT',
  'UNCALIBRATED',
  'UNKNOWN',
]);

export const FaultSeveritySchema = z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL']);

export const MachineFaultSchema = z.object({
  fault_code: MachineFaultCodeSchema,
  severity: FaultSeveritySchema,
  timestamp: TimestampSchema,
  machine_id: EntityIdSchema,
  command_id: CommandIdSchema.nullable().optional(),
  delivery_id: EntityIdSchema.nullable().optional(),
  message: z.string().max(500).describe('Human-readable description for UI/logs'),
  recoverable: z.boolean().describe('Whether operator intervention can clear the fault'),
});

export type MachineFaultCode = z.infer<typeof MachineFaultCodeSchema>;
export type FaultSeverity = z.infer<typeof FaultSeveritySchema>;
export type MachineFault = z.infer<typeof MachineFaultSchema>;
