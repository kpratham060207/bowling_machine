'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { AdminMachineDetail } from '@bowling-machine/api-contracts';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuthenticatedServices } from '@/hooks/use-authenticated-services';
import { ApiClientError } from '@/lib/api/errors';

/**
 * ADMIN machine hardware view — connectivity, state, calibration, faults.
 * Does not expose connection secrets or internal protocol details.
 */
export default function AdminMachineDetailPage() {
  const params = useParams<{ machineId: string }>();
  const machineId = params.machineId;
  const { api } = useAuthenticatedServices();
  const [detail, setDetail] = useState<AdminMachineDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registrationSecret, setRegistrationSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!machineId) return;
    void (async () => {
      try {
        await api.getAdminStatus();
        setDetail(await api.getAdminMachineDetail(machineId));
      } catch (err) {
        setError(err instanceof ApiClientError ? err.displayMessage : 'Failed to load machine');
      } finally {
        setLoading(false);
      }
    })();
  }, [api, machineId]);

  async function handleCreateRegistration() {
    if (!machineId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.createMachineRegistration(machineId);
      setRegistrationSecret(result.connection_secret);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.displayMessage : 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <LoadingSpinner label="Loading machine" />;
  }

  if (error && !detail) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{error}</Alert>
        <Link href="/app/admin/calibration" className="btn-secondary">
          Back to admin
        </Link>
      </div>
    );
  }

  if (!detail) {
    return <Alert variant="error">Machine not found</Alert>;
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <Link href="/app/admin/calibration" className="text-sm text-pitch-700 hover:underline">
          ← Admin
        </Link>
        <h1 className="text-2xl font-bold">{detail.name}</h1>
        <p className="text-sm text-slate-600">
          {detail.kind} · Protocol {detail.protocol_version}
          {detail.last_known_firmware_version
            ? ` · Firmware ${detail.last_known_firmware_version}`
            : null}
        </p>
      </section>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <section className="card space-y-2 text-sm">
        <h2 className="font-semibold">Connectivity</h2>
        <p>Connection: {detail.connection_status}</p>
        <p>Machine state: {detail.machine_state}</p>
        <p>{detail.is_connected ? 'Peer connected' : 'Peer not connected'}</p>
        {detail.emergency_stop_active ? (
          <p className="font-medium text-red-700">Emergency stop active</p>
        ) : null}
      </section>

      <section className="card space-y-2 text-sm">
        <h2 className="font-semibold">Active calibration</h2>
        {detail.active_calibration ? (
          <>
            <p>
              {detail.active_calibration.calibration_type} v{detail.active_calibration.version}
            </p>
            <p>
              {detail.active_calibration.is_simulation ? 'Simulation profile' : 'Hardware profile'}
            </p>
          </>
        ) : (
          <p className="text-slate-500">No active calibration profile</p>
        )}
      </section>

      {detail.active_fault ? (
        <section className="card space-y-2 text-sm">
          <h2 className="font-semibold">Active fault</h2>
          <p>{detail.active_fault.message}</p>
          <p className="text-slate-500">Code: {detail.active_fault.fault_code}</p>
        </section>
      ) : null}

      <section className="card space-y-3">
        <h2 className="font-semibold">Machine registration</h2>
        <p className="text-sm text-slate-600">
          Generate peer credentials for ESP32 connection. Secret is shown once — store securely on
          the device.
        </p>
        <button
          type="button"
          className="btn-secondary"
          disabled={busy}
          onClick={() => void handleCreateRegistration()}
        >
          {busy ? 'Generating…' : 'Generate registration credentials'}
        </button>
        {registrationSecret ? (
          <Alert variant="warning" title="Connection secret (shown once)">
            Copy this secret to the ESP32 configuration. It will not be shown again.
            <pre className="mt-2 overflow-x-auto rounded bg-white p-2 text-xs">
              {registrationSecret}
            </pre>
          </Alert>
        ) : null}
      </section>
    </div>
  );
}
