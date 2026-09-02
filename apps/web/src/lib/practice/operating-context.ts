import type { MachineStatus } from '@bowling-machine/api-contracts';
import type { ConnectMachineResult, ControlLockResult, MachineSummary } from '@/lib/api/client';

/** How the player is using the application — distinct from browser network state. */
export type ApplicationOperatingMode = 'SOFTWARE_ONLY' | 'MACHINE_AVAILABLE';

/** Machine peer connection state for informational UI. */
export type MachineConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING';

/** Whether physical execution can be attempted right now. */
export type ExecutionAvailability = 'UNAVAILABLE' | 'AVAILABLE' | 'NOT_CONNECTED';

export type MachineContextInput = {
  selectedMachine: MachineSummary | ConnectMachineResult | null;
  liveMachineStatus: MachineStatus | null;
  controlLock: ControlLockResult | null;
  sessionId: string | null;
};

/** Resolves whether the player has a machine context selected in the UI. */
export function getApplicationOperatingMode(
  selectedMachine: MachineSummary | ConnectMachineResult | null,
  liveMachineStatus: MachineStatus | null,
): ApplicationOperatingMode {
  if (selectedMachine || liveMachineStatus) {
    return 'MACHINE_AVAILABLE';
  }
  return 'SOFTWARE_ONLY';
}

/** Maps live machine status to a player-facing connection label. */
export function getMachineConnectionState(
  selectedMachine: MachineSummary | ConnectMachineResult | null,
  liveMachineStatus: MachineStatus | null,
): MachineConnectionState {
  if (!selectedMachine && !liveMachineStatus) {
    return 'DISCONNECTED';
  }
  return liveMachineStatus?.connection_status ?? 'DISCONNECTED';
}

/** Human-readable machine connection label for UI banners. */
export function getMachineConnectionLabel(state: MachineConnectionState): string {
  switch (state) {
    case 'CONNECTED':
      return 'Machine connected';
    case 'CONNECTING':
      return 'Connecting to machine…';
    case 'RECONNECTING':
      return 'Machine connection interrupted';
    default:
      return 'Machine not connected';
  }
}

/**
 * Determines whether Phase 1G execution can proceed.
 * Control lock is required only for execution — never for calculation.
 */
export function getExecutionAvailability(context: MachineContextInput): ExecutionAvailability {
  if (!context.sessionId) {
    return 'NOT_CONNECTED';
  }
  if (!context.selectedMachine) {
    return 'NOT_CONNECTED';
  }
  if (!context.controlLock) {
    return 'UNAVAILABLE';
  }
  return 'AVAILABLE';
}

/** Resolves machine_id for calculation — session machine takes priority over selection. */
export function resolveCalculationMachineId(input: {
  sessionMachineId: string | null;
  selectedMachineId: string | null;
  authorizedMachines: MachineSummary[];
}): string | undefined {
  if (input.sessionMachineId) {
    return input.sessionMachineId;
  }
  if (input.selectedMachineId) {
    return input.selectedMachineId;
  }
  const simulator = input.authorizedMachines.find((machine) => machine.kind === 'SIMULATOR');
  return simulator?.machine_id;
}

/** Returns true when machine/calibration context changed and stale calculation should clear. */
export function shouldInvalidateCalculation(input: {
  calculatedForMachineId: string | null | undefined;
  currentMachineId: string | undefined;
}): boolean {
  const previous = input.calculatedForMachineId ?? null;
  const current = input.currentMachineId ?? null;
  return previous !== current;
}
