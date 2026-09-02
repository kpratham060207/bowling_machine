import type { MachineConnectionStatus, MachineState } from '@bowling-machine/api-contracts';
import { MACHINE_STATE_DESCRIPTIONS } from '@bowling-machine/api-contracts';

/** Human-readable machine runtime state for UI labels. */
export function formatMachineState(state: MachineState): string {
  return state.replaceAll('_', ' ');
}

export function getMachineStateDescription(state: MachineState): string {
  return MACHINE_STATE_DESCRIPTIONS[state];
}

/** Human-readable connection status label. */
export function formatConnectionStatus(status: MachineConnectionStatus): string {
  switch (status) {
    case 'DISCONNECTED':
      return 'Disconnected';
    case 'CONNECTING':
      return 'Connecting…';
    case 'CONNECTED':
      return 'Connected';
    case 'RECONNECTING':
      return 'Reconnecting…';
    default:
      return status;
  }
}

export type ControlLockUiState =
  'AVAILABLE' | 'ACQUIRING' | 'CONTROLLED_BY_ME' | 'CONTROLLED_BY_OTHER' | 'EXPIRED';

export function resolveControlLockUiState(input: {
  hasControl: boolean;
  controlExpiresAt: string | null;
  isAcquiring?: boolean;
}): ControlLockUiState {
  if (input.isAcquiring) {
    return 'ACQUIRING';
  }

  if (!input.controlExpiresAt) {
    return 'AVAILABLE';
  }

  const expiresMs = new Date(input.controlExpiresAt).getTime();
  if (Number.isFinite(expiresMs) && expiresMs <= Date.now()) {
    return 'EXPIRED';
  }

  return input.hasControl ? 'CONTROLLED_BY_ME' : 'CONTROLLED_BY_OTHER';
}

export function controlLockLabel(state: ControlLockUiState): string {
  switch (state) {
    case 'AVAILABLE':
      return 'Control available';
    case 'ACQUIRING':
      return 'Acquiring control…';
    case 'CONTROLLED_BY_ME':
      return 'You have control';
    case 'CONTROLLED_BY_OTHER':
      return 'Controlled by another player';
    case 'EXPIRED':
      return 'Control lock expired';
  }
}
