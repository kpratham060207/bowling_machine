import type { MachineConnectionStatus, MachineState } from '@bowling-machine/api-contracts';
import {
  formatConnectionStatus,
  formatMachineState,
  getMachineStateDescription,
} from '@/lib/machine/presentation';

type MachineStatusPanelProps = {
  machineName: string;
  machineState: MachineState | null;
  connectionStatus: MachineConnectionStatus | null;
  homingStatus?: string | null;
};

/**
 * Displays machine runtime state separately from connection state.
 * These are distinct concepts — do not collapse them in the UI.
 */
export function MachineStatusPanel({
  machineName,
  machineState,
  connectionStatus,
  homingStatus,
}: MachineStatusPanelProps) {
  return (
    <section className="card space-y-3" aria-label="Machine status">
      <div>
        <h2 className="text-lg font-semibold">{machineName}</h2>
        <p className="text-sm text-slate-600">Live machine and connection status</p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Machine</dt>
          <dd className="mt-1 text-base font-semibold text-slate-900">
            {machineState ? formatMachineState(machineState) : 'Unknown'}
          </dd>
          {machineState ? (
            <dd className="text-xs text-slate-500">{getMachineStateDescription(machineState)}</dd>
          ) : null}
        </div>

        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Connection</dt>
          <dd className="mt-1 text-base font-semibold text-slate-900">
            {connectionStatus ? formatConnectionStatus(connectionStatus) : 'Unknown'}
          </dd>
        </div>

        {homingStatus ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Homing</dt>
            <dd className="mt-1 text-base font-semibold text-slate-900">{homingStatus}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
