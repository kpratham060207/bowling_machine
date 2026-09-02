'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { usePracticeContext } from '@/lib/practice/practice-context';
import {
  getApplicationOperatingMode,
  getMachineConnectionLabel,
  getMachineConnectionState,
} from '@/lib/practice/operating-context';

/**
 * Practice hub — entry for software-only configuration or optional machine connection.
 * Machine connection is informational and optional for calculation/planning workflows.
 */
export default function PracticeHubPage() {
  const { selectedMachine, liveMachineStatus } = usePracticeContext();
  const [machineName, setMachineName] = useState<string | null>(null);

  const operatingMode = getApplicationOperatingMode(selectedMachine, liveMachineStatus);
  const connectionState = getMachineConnectionState(selectedMachine, liveMachineStatus);
  const connectionLabel = getMachineConnectionLabel(connectionState);

  useEffect(() => {
    if (!selectedMachine) {
      setMachineName(null);
      return;
    }
    setMachineName('name' in selectedMachine ? selectedMachine.name : null);
  }, [selectedMachine]);

  return (
    <div className="space-y-6">
      <section className="card space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Practice</h1>
          <p className="mt-2 text-sm text-slate-600">
            Configure deliveries, calculate machine parameters, and optionally connect a machine to
            execute them.
          </p>
        </div>

        <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold text-slate-800">Machine</h2>
          <p className="mt-1 text-sm text-slate-700">{connectionLabel}</p>
          {machineName ? <p className="text-sm text-slate-600">{machineName}</p> : null}

          {operatingMode === 'SOFTWARE_ONLY' ? (
            <p className="mt-3 text-sm text-slate-600">
              You can still configure and calculate a delivery. Connect a machine later to execute
              it.
            </p>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              Calculation and execution are available when you have control of the connected
              machine.
            </p>
          )}
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/app/practice/setup" className="btn-primary text-center">
            Configure practice
          </Link>
          <Link href="/app/practice/connect" className="btn-secondary text-center">
            Connect machine
          </Link>
        </div>
      </section>

      {operatingMode === 'SOFTWARE_ONLY' ? (
        <Alert variant="info">
          Software-only mode — calculation is available without a connected machine. Physical
          execution requires connecting to a machine and acquiring control.
        </Alert>
      ) : null}
    </div>
  );
}
