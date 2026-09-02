'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { CalibrationProfileSummary } from '@bowling-machine/api-contracts';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuthenticatedServices } from '@/hooks/use-authenticated-services';
import { ApiClientError } from '@/lib/api/errors';
import { SIMULATION_CALIBRATION_V1 } from '@/lib/calibration/simulation-template';

/** ADMIN-only calibration management — players must not access this page. */
export default function AdminCalibrationPage() {
  const { api } = useAuthenticatedServices();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [machines, setMachines] = useState<
    Array<{ machine_id: string; name: string; kind: string }>
  >([]);
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [profiles, setProfiles] = useState<CalibrationProfileSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        await api.getAdminStatus();
        setAuthorized(true);
        const machineList = await api.listAdminMachines();
        setMachines(machineList);
        if (machineList[0]) {
          setSelectedMachineId(machineList[0].machine_id);
        }
      } catch {
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [api]);

  useEffect(() => {
    if (!selectedMachineId || !authorized) return;
    void (async () => {
      try {
        setProfiles(await api.listCalibrationProfiles(selectedMachineId));
      } catch (err) {
        setError(err instanceof ApiClientError ? err.displayMessage : 'Failed to load profiles');
      }
    })();
  }, [api, authorized, selectedMachineId]);

  async function handleCreateSimulationProfile() {
    if (!selectedMachineId || busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api.createCalibrationProfile(selectedMachineId, {
        calibration_type: 'simulation_v1',
        data: SIMULATION_CALIBRATION_V1,
        notes: 'Explicit simulation-only calibration profile',
      });
      setProfiles(await api.listCalibrationProfiles(selectedMachineId));
      setMessage('Simulation calibration profile created as DRAFT');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.displayMessage : 'Create failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleActivate(profileId: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.activateCalibrationProfile(profileId);
      setProfiles(await api.listCalibrationProfiles(selectedMachineId));
      setMessage('Calibration profile activated');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.displayMessage : 'Activation failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading admin calibration" />;
  if (!authorized) {
    return (
      <Alert variant="error" title="Admin access required">
        This page is restricted to ADMIN accounts.
        <Link href="/app" className="mt-2 block underline">
          Return to player app
        </Link>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/app" className="text-sm font-medium text-pitch-700 hover:underline">
        ← Player app
      </Link>
      <h1 className="text-2xl font-bold">Calibration management</h1>
      <p className="text-sm text-slate-600">
        Simulation profiles are explicitly labeled — not production physical constants.
      </p>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {message ? <Alert variant="info">{message}</Alert> : null}

      <section className="card space-y-3">
        <label className="block">
          <span className="label-text">Machine</span>
          <select
            className="input-field"
            value={selectedMachineId}
            onChange={(e) => {
              setSelectedMachineId(e.target.value);
            }}
          >
            {machines.map((machine) => (
              <option key={machine.machine_id} value={machine.machine_id}>
                {machine.name} ({machine.kind})
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn-secondary"
          disabled={busy || !selectedMachineId}
          onClick={() => void handleCreateSimulationProfile()}
        >
          Create simulation profile (draft)
        </button>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Profiles</h2>
        {profiles.length === 0 ? (
          <p className="text-sm text-slate-600">No calibration profiles for this machine.</p>
        ) : (
          <ul className="space-y-2">
            {profiles.map((profile) => (
              <li
                key={profile.profile_id}
                className="rounded-lg border border-slate-200 p-3 text-sm"
              >
                <p className="font-medium">
                  {profile.calibration_type} v{profile.version} · {profile.status}
                </p>
                <p className="text-slate-600">
                  {profile.is_simulation ? 'Simulation-only' : 'Non-simulation data'}
                </p>
                {profile.status === 'DRAFT' ? (
                  <button
                    type="button"
                    className="btn-primary mt-2"
                    disabled={busy}
                    onClick={() => void handleActivate(profile.profile_id)}
                  >
                    Activate profile
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
