import { z } from 'zod';

/**
 * Authoritative machine state enum — owned by ESP32 firmware at runtime.
 * Contract only; state machine logic is NOT implemented here.
 */
export const MachineStateSchema = z.enum([
  'OFF',
  'INITIALIZING',
  'HOMING',
  'READY',
  'POSITIONING',
  'SPINNING_UP',
  'READY_TO_THROW',
  'FEEDING',
  'WAITING',
  'STOPPING',
  'ERROR',
  'EMERGENCY_STOP',
]);

export type MachineState = z.infer<typeof MachineStateSchema>;

/** Brief meaning of each machine state for documentation and UI tooltips. */
export const MACHINE_STATE_DESCRIPTIONS: Record<MachineState, string> = {
  OFF: 'Main power off; firmware not running',
  INITIALIZING: 'Boot and self-test in progress',
  HOMING: 'Actuators moving to home position via limit switches',
  READY: 'Homed and idle; accepting commands',
  POSITIONING: 'Actuators moving to target positions',
  SPINNING_UP: 'Launch wheels accelerating to target RPM',
  READY_TO_THROW: 'At speed and positioned; awaiting feed trigger',
  FEEDING: 'Ball feed mechanism active',
  WAITING: 'Between balls in a multi-ball sequence',
  STOPPING: 'Ramping down to safe state',
  ERROR: 'Fault halted operations',
  EMERGENCY_STOP: 'Physical E-stop active; all motion halted',
};
