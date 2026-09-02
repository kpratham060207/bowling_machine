'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { WebSocketEvent } from '@bowling-machine/api-contracts';
import { ControlLockBadge } from '@/components/control-lock-badge';
import { MachineStatusPanel } from '@/components/machine-status-panel';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuthenticatedServices } from '@/hooks/use-authenticated-services';
import type { MachineSummary } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/errors';
import { usePracticeContext } from '@/lib/practice/practice-context';
import { resolveControlLockUiState, type ControlLockUiState } from '@/lib/machine/presentation';

/**
 * Machine connection workflow:
 * identify machine → verify availability → acquire control → home → create session
 */
export default function ConnectMachinePage() {
  const router = useRouter();
  const practice = usePracticeContext();
  const [machines, setMachines] = useState<MachineSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [controlUi, setControlUi] = useState<ControlLockUiState>('AVAILABLE');

  const handleWsEvent = useCallback(
    (event: WebSocketEvent) => {
      if (event.event_type === 'STATUS_UPDATED') {
        practice.setLiveMachineStatus(event.payload.status);
      }
    },
    [practice],
  );

  const { api } = useAuthenticatedServices({ onEvent: handleWsEvent });

  const refreshMachines = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listMachines();
      setMachines(data);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.displayMessage : 'Failed to load machines');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void refreshMachines();
  }, [refreshMachines]);

  const selectedMachine = machines.find((m) => m.machine_id === selectedId) ?? null;

  async function handleSelectMachine(machine: MachineSummary) {
    setSelectedId(machine.machine_id);
    setError(null);
    practice.setSelectedMachine(machine);

    try {
      const detail = await api.getMachine(machine.machine_id);
      practice.setLiveMachineStatus(detail.status);
      setControlUi(
        resolveControlLockUiState({
          hasControl: detail.control?.is_owner ?? machine.has_control,
          controlExpiresAt: detail.control?.expires_at ?? machine.control_expires_at,
        }),
      );
    } catch (err) {
      setError(err instanceof ApiClientError ? err.displayMessage : 'Failed to load machine');
    }
  }

  async function handleConnectByQr() {
    if (qrToken.trim().length < 16) {
      setError('Enter a valid machine QR token');
      return;
    }

    setBusy('connect');
    setError(null);
    try {
      const result = await api.connectByQrToken(qrToken.trim());
      practice.setSelectedMachine(result);
      setSelectedId(result.machine_id);
      const detail = await api.getMachine(result.machine_id);
      practice.setLiveMachineStatus(detail.status);
      await refreshMachines();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.displayMessage : 'Connection failed');
    } finally {
      setBusy(null);
    }
  }

  async function handleAcquireControl() {
    if (!selectedId) return;
    setBusy('control');
    setControlUi('ACQUIRING');
    setError(null);
    try {
      const lock = await api.acquireControl(selectedId);
      practice.setControlLock(lock);
      setControlUi('CONTROLLED_BY_ME');
    } catch (err) {
      setControlUi(
        resolveControlLockUiState({
          hasControl: false,
          controlExpiresAt: selectedMachine?.control_expires_at ?? null,
        }),
      );
      setError(err instanceof ApiClientError ? err.displayMessage : 'Could not acquire control');
    } finally {
      setBusy(null);
    }
  }

  async function handleHome() {
    if (!selectedId) return;
    setBusy('home');
    setError(null);
    try {
      await api.homeMachine(selectedId);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.displayMessage : 'Homing failed');
    } finally {
      setBusy(null);
    }
  }

  async function handleCreateSession() {
    if (!selectedId) return;
    setBusy('session');
    setError(null);
    try {
      const session = await api.createSession({ machine_id: selectedId });
      practice.setActiveSessionId(session.session_id);
      router.push(`/app/practice/setup?sessionId=${session.session_id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.displayMessage : 'Session creation failed');
    } finally {
      setBusy(null);
    }
  }

  const liveStatus = practice.liveMachineStatus;
  const machineName =
    selectedMachine?.name ??
    (practice.selectedMachine && 'name' in practice.selectedMachine
      ? practice.selectedMachine.name
      : 'Selected machine');

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold">Connect to machine</h1>
        <p className="text-sm text-slate-600">
          Select an authorized machine or scan its QR token. Control must be acquired before
          starting a session.
        </p>
      </section>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Your machines</h2>
        {loading ? <LoadingSpinner label="Loading machines" /> : null}

        {!loading && machines.length === 0 ? (
          <EmptyState
            title="No available bowling machines found"
            description="Ask an administrator to grant you access to a machine."
          />
        ) : null}

        {!loading && machines.length > 0 ? (
          <ul className="space-y-2">
            {machines.map((machine) => (
              <li key={machine.machine_id}>
                <button
                  type="button"
                  onClick={() => void handleSelectMachine(machine)}
                  className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                    selectedId === machine.machine_id
                      ? 'border-pitch-600 bg-pitch-50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <p className="font-semibold">{machine.name}</p>
                  <p className="text-xs text-slate-500">{machine.serial_number}</p>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Connect by QR token</h2>
        <label className="block">
          <span className="label-text">Machine QR token</span>
          <input
            className="input-field"
            value={qrToken}
            onChange={(e) => {
              setQrToken(e.target.value);
            }}
            placeholder="Paste token from machine QR code"
            autoComplete="off"
          />
        </label>
        <button
          type="button"
          className="btn-secondary"
          disabled={busy !== null}
          onClick={() => void handleConnectByQr()}
        >
          {busy === 'connect' ? 'Connecting…' : 'Connect'}
        </button>
      </section>

      {selectedId ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <ControlLockBadge state={controlUi} />
          </div>

          <MachineStatusPanel
            machineName={machineName}
            machineState={liveStatus?.state ?? null}
            connectionStatus={liveStatus?.connection_status ?? null}
            homingStatus={liveStatus?.homing_status ?? null}
          />

          <section className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              className="btn-secondary"
              disabled={busy !== null || controlUi === 'CONTROLLED_BY_ME'}
              onClick={() => void handleAcquireControl()}
            >
              {busy === 'control' ? 'Acquiring…' : 'Acquire control'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={busy !== null || controlUi !== 'CONTROLLED_BY_ME'}
              onClick={() => void handleHome()}
            >
              {busy === 'home' ? 'Homing…' : 'Home machine'}
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={busy !== null || controlUi !== 'CONTROLLED_BY_ME'}
              onClick={() => void handleCreateSession()}
            >
              {busy === 'session' ? 'Creating session…' : 'Create practice session'}
            </button>
          </section>
        </>
      ) : null}

      <Link href="/app/practice" className="text-sm font-medium text-pitch-700 hover:underline">
        Back to practice
      </Link>
    </div>
  );
}
