import type { MachineState } from '@bowling-machine/api-contracts';

/**
 * Simulated machine runtime — deterministic state machine (NOT physical motor physics).
 *
 * Safety semantics are modeled (reject invalid commands, E-stop) but this is NOT
 * physical safety validation. See docs/protocol/SIMULATOR.md.
 */
export type SimulatorRuntime = {
  machineId: string;
  machineKind: 'SIMULATOR' | 'HARDWARE';
  state: MachineState;
  homingStatus: 'UNKNOWN' | 'NOT_HOMED' | 'HOMING' | 'HOMED' | 'FAULT';
  emergencyStopActive: boolean;
  activeFaultCode: string | null;
  activeCommandId: string | null;
  activeDeliveryId: string | null;
  wheel1CurrentRpm: number | null;
  wheel2CurrentRpm: number | null;
  wheel1TargetRpm: number | null;
  wheel2TargetRpm: number | null;
  feederStatus: 'IDLE' | 'READY' | 'FEEDING' | 'JAMMED' | 'FAULT' | 'UNKNOWN';
  sequenceRemaining: number;
  sequenceTotal: number;
  storedCalibration: Record<string, unknown> | null;
};

export function createInitialRuntime(
  machineId: string,
  machineKind: 'SIMULATOR' | 'HARDWARE' = 'SIMULATOR',
): SimulatorRuntime {
  return {
    machineId,
    machineKind,
    state: 'INITIALIZING',
    homingStatus: 'NOT_HOMED',
    emergencyStopActive: false,
    activeFaultCode: null,
    activeCommandId: null,
    activeDeliveryId: null,
    wheel1CurrentRpm: 0,
    wheel2CurrentRpm: 0,
    wheel1TargetRpm: null,
    wheel2TargetRpm: null,
    feederStatus: 'IDLE',
    sequenceRemaining: 0,
    sequenceTotal: 0,
    storedCalibration: null,
  };
}

/** States that accept normal motion commands in the simulator. */
export const COMMAND_READY_STATES: ReadonlySet<MachineState> = new Set([
  'READY',
  'WAITING',
  'READY_TO_THROW',
]);

export function canAcceptMotionCommand(runtime: SimulatorRuntime): boolean {
  if (runtime.emergencyStopActive) {
    return false;
  }
  if (runtime.state === 'ERROR' || runtime.state === 'EMERGENCY_STOP') {
    return false;
  }
  return true;
}

export function transitionState(runtime: SimulatorRuntime, next: MachineState): MachineState {
  const previous = runtime.state;
  runtime.state = next;
  return previous;
}
