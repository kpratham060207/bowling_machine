'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PracticeSession, WebSocketEvent } from '@bowling-machine/api-contracts';
import { MachineStatusPanel } from '@/components/machine-status-panel';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuthenticatedServices } from '@/hooks/use-authenticated-services';
import { ApiClientError } from '@/lib/api/errors';
import { BALL_TYPE_LABELS } from '@/lib/practice/setup-state';
import { usePracticeContext } from '@/lib/practice/practice-context';

/** Live session execution shell — receives WebSocket updates and supports stop. */
export default function LiveSessionPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const practice = usePracticeContext();
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState<string | null>(null);

  const refreshSession = useCallback(
    async (apiClient: ReturnType<typeof useAuthenticatedServices>['api']) => {
      const data = await apiClient.getSession(sessionId);
      setSession(data);
      return data;
    },
    [sessionId],
  );

  const handleWsEvent = useCallback(
    (event: WebSocketEvent) => {
      if (event.event_type === 'STATUS_UPDATED') {
        practice.setLiveMachineStatus(event.payload.status);
      }

      if (
        event.event_type === 'SESSION_STARTED' ||
        event.event_type === 'SESSION_COMPLETED' ||
        event.event_type === 'DELIVERY_STARTED' ||
        event.event_type === 'DELIVERY_COMPLETED' ||
        event.event_type === 'DELIVERY_FAILED'
      ) {
        if ('session_id' in event.payload && event.payload.session_id === sessionId) {
          setLiveMessage(event.event_type.replaceAll('_', ' ').toLowerCase());
        }
      }

      if (event.event_type === 'FAULT') {
        setLiveMessage(`Machine fault: ${event.payload.fault.message}`);
      }
    },
    [practice, sessionId],
  );

  const { api, wsState, reconnectWebSocket } = useAuthenticatedServices({ onEvent: handleWsEvent });

  useEffect(() => {
    void (async () => {
      try {
        await refreshSession(api);
      } catch (err) {
        setError(err instanceof ApiClientError ? err.displayMessage : 'Failed to load session');
      } finally {
        setLoading(false);
      }
    })();
  }, [api, refreshSession]);

  // Refresh durable state after live events — REST remains source of truth.
  useEffect(() => {
    if (!liveMessage) return;
    void refreshSession(api).catch(() => undefined);
  }, [liveMessage, api, refreshSession]);

  async function handleStop() {
    setBusy(true);
    setError(null);
    try {
      await api.stopSession(sessionId);
      await refreshSession(api);
      setLiveMessage('Session stopped');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.displayMessage : 'Stop failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <LoadingSpinner label="Loading session" />;
  }

  if (error && !session) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{error}</Alert>
        <Link href="/app" className="btn-secondary">
          Return home
        </Link>
      </div>
    );
  }

  if (!session) {
    return <Alert variant="error">Session not found</Alert>;
  }

  const liveStatus = practice.liveMachineStatus;
  const currentDelivery = session.deliveries.find((d) => d.status === 'EXECUTING') ?? null;

  /** Progress within the current delivery sequence — only when backend provides counts. */
  const deliveryProgress = useMemo(() => {
    if (!currentDelivery) {
      return null;
    }
    const planned = currentDelivery.requested.number_of_balls;
    const deliveredInSession = session.total_balls_delivered;
    if (planned <= 0) {
      return null;
    }
    return {
      sequenceLabel: `Delivery ${currentDelivery.sequence_number}`,
      ballsLabel: `${deliveredInSession} of ${session.total_balls_planned} balls delivered in session`,
      ballType: BALL_TYPE_LABELS[currentDelivery.requested.ball_type],
      speedKmh: currentDelivery.requested.desired_speed_kmh,
    };
  }, [currentDelivery, session.total_balls_delivered, session.total_balls_planned]);

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold">Live session</h1>
        <p className="text-sm text-slate-600 capitalize">Status: {session.status.toLowerCase()}</p>
      </section>

      {wsState === 'reconnecting' ? (
        <Alert variant="warning" title="Live updates reconnecting">
          Connection degraded — attempting to reconnect. Session state will refresh from the server.
          <button type="button" className="ml-2 underline" onClick={reconnectWebSocket}>
            Retry now
          </button>
        </Alert>
      ) : null}

      {wsState === 'disconnected' ? (
        <Alert variant="warning" title="Live updates disconnected">
          WebSocket disconnected after multiple retries.
          <button type="button" className="ml-2 underline" onClick={reconnectWebSocket}>
            Reconnect
          </button>
        </Alert>
      ) : null}

      {error ? <Alert variant="error">{error}</Alert> : null}
      {liveMessage ? <Alert variant="info">{liveMessage}</Alert> : null}

      <MachineStatusPanel
        machineName="Practice machine"
        machineState={liveStatus?.state ?? null}
        connectionStatus={liveStatus?.connection_status ?? null}
        homingStatus={liveStatus?.homing_status ?? null}
      />

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Session progress</h2>
        <p className="text-sm text-slate-600">
          {session.total_balls_delivered}/{session.total_balls_planned} balls delivered
        </p>
        {currentDelivery ? (
          <div className="space-y-1 text-sm">
            <p>
              {deliveryProgress?.sequenceLabel} —{' '}
              <span className="capitalize">{currentDelivery.status.toLowerCase()}</span>
            </p>
            <p className="text-slate-600">{deliveryProgress?.ballsLabel}</p>
            <p className="text-slate-600">
              {deliveryProgress?.ballType} · {deliveryProgress?.speedKmh} km/h
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No delivery executing</p>
        )}

        <ul className="space-y-2">
          {session.deliveries.map((delivery) => (
            <li
              key={delivery.delivery_id}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <span className="font-medium">#{delivery.sequence_number}</span> ·{' '}
              <span className="capitalize">{delivery.status.toLowerCase()}</span>
              {delivery.error?.message ? (
                <span className="block text-red-700">{delivery.error.message}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          className="btn-danger"
          disabled={busy || session.status === 'COMPLETED' || session.status === 'CANCELLED'}
          onClick={() => void handleStop()}
        >
          {busy ? 'Stopping…' : 'Stop session'}
        </button>
        <Link
          href={`/app/practice/setup?sessionId=${sessionId}`}
          className="btn-secondary text-center"
        >
          Setup
        </Link>
        <Link href="/app/history" className="btn-secondary text-center">
          History
        </Link>
      </section>
    </div>
  );
}
