'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { PracticeSession } from '@bowling-machine/api-contracts';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuthenticatedServices } from '@/hooks/use-authenticated-services';
import { ApiClientError } from '@/lib/api/errors';

/** Session detail view — persisted delivery information only, no invented stats. */
export default function HistoryDetailPage() {
  const params = useParams<{ sessionId: string }>();
  const { api } = useAuthenticatedServices();
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setSession(await api.getSession(params.sessionId));
      } catch (err) {
        setError(err instanceof ApiClientError ? err.displayMessage : 'Failed to load session');
      } finally {
        setLoading(false);
      }
    })();
  }, [api, params.sessionId]);

  if (loading) return <LoadingSpinner label="Loading session" />;
  if (error || !session) return <Alert variant="error">{error ?? 'Session not found'}</Alert>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/history" className="text-sm font-medium text-pitch-700 hover:underline">
          ← Back to history
        </Link>
        <h1 className="mt-2 text-2xl font-bold capitalize">
          {session.status.toLowerCase()} session
        </h1>
        <p className="text-sm text-slate-600">{new Date(session.started_at).toLocaleString()}</p>
      </div>

      <section className="card space-y-2">
        <h2 className="text-lg font-semibold">Summary</h2>
        <p className="text-sm">
          Balls: {session.total_balls_delivered}/{session.total_balls_planned}
        </p>
        <p className="text-sm">Deliveries: {session.deliveries.length}</p>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Deliveries</h2>
        {session.deliveries.length === 0 ? (
          <p className="text-sm text-slate-600">No deliveries recorded.</p>
        ) : (
          <ul className="space-y-2">
            {session.deliveries.map((delivery) => (
              <li
                key={delivery.delivery_id}
                className="rounded-lg border border-slate-200 p-3 text-sm"
              >
                <p className="font-medium">
                  #{delivery.sequence_number} ·{' '}
                  <span className="capitalize">{delivery.status.toLowerCase()}</span>
                </p>
                <p>
                  Target ({delivery.requested.target_x}, {delivery.requested.target_y}) ·{' '}
                  {delivery.requested.desired_speed_kmh} km/h · {delivery.requested.ball_type}
                </p>
                {delivery.error?.message ? (
                  <p className="text-red-700">{delivery.error.message}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        href={`/app/practice/session/${session.session_id}`}
        className="btn-secondary inline-flex"
      >
        Open live view
      </Link>
    </div>
  );
}
