'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PracticeSession } from '@bowling-machine/api-contracts';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuthenticatedServices } from '@/hooks/use-authenticated-services';
import { ApiClientError } from '@/lib/api/errors';

function countByStatus(session: PracticeSession, status: string): number {
  return session.deliveries.filter((d) => d.status === status).length;
}

/** Player session history — readable summaries without invented analytics. */
export default function HistoryPage() {
  const { api } = useAuthenticatedServices();
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setSessions(await api.listSessions());
      } catch (err) {
        setError(err instanceof ApiClientError ? err.displayMessage : 'Failed to load history');
      } finally {
        setLoading(false);
      }
    })();
  }, [api]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Practice history</h1>

      {loading ? <LoadingSpinner label="Loading history" /> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}

      {!loading && !error && sessions.length === 0 ? (
        <EmptyState
          title="No practice sessions yet"
          description="Executed sessions appear here. You can configure and calculate deliveries without a connected machine."
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

      {!loading && sessions.length > 0 ? (
        <ul className="space-y-3">
          {sessions.map((session) => {
            const failed = countByStatus(session, 'FAILED');
            const cancelled = countByStatus(session, 'CANCELLED');
            return (
              <li key={session.session_id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold capitalize">{session.status.toLowerCase()}</p>
                    {session.total_balls_delivered === 0 && session.status !== 'COMPLETED' ? (
                      <p className="text-xs text-slate-500">No balls executed yet</p>
                    ) : null}
                    <p className="text-sm text-slate-600">
                      {new Date(session.started_at).toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-600">
                      {session.machine_name ?? 'Machine'} · {session.deliveries.length} deliveries ·{' '}
                      {session.total_balls_delivered}/{session.total_balls_planned} balls
                    </p>
                    {failed > 0 || cancelled > 0 ? (
                      <p className="text-sm text-amber-800">
                        {failed > 0 ? `${failed} failed` : null}
                        {failed > 0 && cancelled > 0 ? ' · ' : null}
                        {cancelled > 0 ? `${cancelled} cancelled` : null}
                      </p>
                    ) : null}
                  </div>
                  <Link
                    href={`/app/history/${session.session_id}`}
                    className="btn-secondary shrink-0"
                  >
                    Details
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
