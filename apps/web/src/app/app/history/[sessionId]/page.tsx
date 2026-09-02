'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { PracticeSession } from '@bowling-machine/api-contracts';
import { DeliveryReviewCard } from '@/components/delivery-review-card';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuthenticatedServices } from '@/hooks/use-authenticated-services';
import { ApiClientError } from '@/lib/api/errors';

function sessionDurationMs(session: PracticeSession): number | null {
  if (!session.ended_at) return null;
  return new Date(session.ended_at).getTime() - new Date(session.started_at).getTime();
}

/** Session detail with requested / calculated / observed delivery separation. */
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

  const stats = useMemo(() => {
    if (!session) return null;
    const failed = session.deliveries.filter((d) => d.status === 'FAILED').length;
    const cancelled = session.deliveries.filter((d) => d.status === 'CANCELLED').length;
    const completed = session.deliveries.filter((d) => d.status === 'COMPLETED').length;
    return { failed, cancelled, completed };
  }, [session]);

  if (loading) return <LoadingSpinner label="Loading session" />;
  if (error || !session) return <Alert variant="error">{error ?? 'Session not found'}</Alert>;

  const duration = sessionDurationMs(session);

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
        <h2 className="text-lg font-semibold">Session summary</h2>
        <p className="text-sm">Machine: {session.machine_name ?? session.machine_id}</p>
        {session.source_plan_id ? (
          <p className="text-sm text-slate-600">
            Created from plan snapshot · {session.source_plan_id}
          </p>
        ) : null}
        <p className="text-sm">
          Balls delivered: {session.total_balls_delivered}/{session.total_balls_planned}
        </p>
        <p className="text-sm">
          Deliveries — completed: {stats?.completed ?? 0}, failed: {stats?.failed ?? 0}, cancelled:{' '}
          {stats?.cancelled ?? 0}
        </p>
        {duration != null ? (
          <p className="text-sm">Duration: {Math.round(duration / 1000)} s</p>
        ) : (
          <p className="text-sm text-slate-500">Duration: Not available</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Deliveries</h2>
        {session.deliveries.length === 0 ? (
          <p className="text-sm text-slate-600">No deliveries recorded.</p>
        ) : (
          session.deliveries.map((delivery) => (
            <DeliveryReviewCard key={delivery.delivery_id} delivery={delivery} />
          ))
        )}
      </section>

      {session.status === 'ACTIVE' ? (
        <Link
          href={`/app/practice/session/${session.session_id}`}
          className="btn-secondary inline-flex"
        >
          Open live view
        </Link>
      ) : null}
    </div>
  );
}
