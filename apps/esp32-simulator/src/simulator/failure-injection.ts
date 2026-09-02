/**
 * Controlled failure injection for development and automated tests.
 * Not exposed to player UI — configured via SIMULATOR_FAILURE_MODE env var.
 */
export type FailureMode =
  | 'none'
  | 'connection_loss'
  | 'heartbeat_timeout'
  | 'command_timeout'
  | 'machine_fault'
  | 'actuator_failure'
  | 'wheel_spinup_failure'
  | 'feeder_failure'
  | 'emergency_stop';

export function parseFailureMode(value: string | undefined): FailureMode {
  const modes: FailureMode[] = [
    'none',
    'connection_loss',
    'heartbeat_timeout',
    'command_timeout',
    'machine_fault',
    'actuator_failure',
    'wheel_spinup_failure',
    'feeder_failure',
    'emergency_stop',
  ];
  if (value && modes.includes(value as FailureMode)) {
    return value as FailureMode;
  }
  return 'none';
}

export function shouldInjectFailure(mode: FailureMode, trigger: FailureMode): boolean {
  return mode !== 'none' && mode === trigger;
}
