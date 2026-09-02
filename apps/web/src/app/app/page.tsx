'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PracticeSession } from '@bowling-machine/api-contracts';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuthenticatedServices } from '@/hooks/use-authenticated-services';
import { ApiClientError } from '@/lib/api/errors';

/** Player home dashboard — recent sessions and primary practice action. */
export default function AppDashboardPage() {
  const { api } = useAuthenticatedServices();
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await api.listSessions();
        setSessions(data);
      } catch (err) {
        setError(err instanceof ApiClientError ? err.displayMessage : 'Failed to load sessions');
      } finally {
        setLoading(false);
      }
    })();
  }, [api]);

  const recent = sessions.slice(0, 3);

  return (
    <div className="space-y-6">
      <section className="card space-y-3">
        <h1 className="text-2xl font-bold text-slate-900">Practice dashboard</h1>
        <p className="text-sm text-slate-600">
          Configure deliveries, calculate machine parameters, and optionally connect a machine to
          execute them.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/app/practice/setup" className="btn-primary text-center">
            Configure practice
          </Link>
          <Link href="/app/practice/connect" className="btn-secondary text-center">
            Connect to machine
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent sessions</h2>
        {loading ? <LoadingSpinner label="Loading sessions" /> : null}
        {error ? <Alert variant="error">{error}</Alert> : null}

        {!loading && !error && recent.length === 0 ? (
          <EmptyState
            title="No practice sessions yet"
            description="Configure a delivery and calculate machine parameters — a connected machine is only required for physical execution."
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link href="/app/practice/setup" className="btn-primary">
                  Configure practice
                </Link>
                <Link href="/app/practice/connect" className="btn-secondary">
                  Connect to a machine
                </Link>
              </div>
            }
          />
        ) : null}

        {!loading && recent.length > 0 ? (
          <ul className="space-y-3">
            {recent.map((session) => (
              <li key={session.session_id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold capitalize">{session.status.toLowerCase()}</p>
                    <p className="text-sm text-slate-600">
                      {session.total_balls_delivered}/{session.total_balls_planned} balls ·{' '}
                      {new Date(session.started_at).toLocaleString()}
                    </p>
                  </div>
                  <Link
                    href={`/app/practice/session/${session.session_id}`}
                    className="btn-secondary shrink-0"
                  >
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {sessions.length > 0 ? (
          <Link href="/app/history" className="text-sm font-medium text-pitch-700 hover:underline">
            View all history
          </Link>
        ) : null}
      </section>
    </div>
  );
}
