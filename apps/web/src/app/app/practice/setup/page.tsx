'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import type { PracticeSession } from '@bowling-machine/api-contracts';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuthenticatedServices } from '@/hooks/use-authenticated-services';
import { ApiClientError } from '@/lib/api/errors';

/**
 * Practice setup shell — placeholder for Phase 1H-B interactive pitch configuration.
 * Does NOT send placeholder delivery requests or fake coordinates.
 */
function PracticeSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const { api } = useAuthenticatedServices();
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      setError('Missing session. Create a practice session first.');
      return;
    }

    void (async () => {
      try {
        const data = await api.getSession(sessionId);
        setSession(data);
      } catch (err) {
        setError(err instanceof ApiClientError ? err.displayMessage : 'Failed to load session');
      } finally {
        setLoading(false);
      }
    })();
  }, [api, sessionId]);

  if (loading) {
    return <LoadingSpinner label="Loading session" />;
  }

  if (error || !session) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{error ?? 'Session not found'}</Alert>
        <Link href="/app/practice/connect" className="btn-secondary">
          Connect to a machine
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold">Practice setup</h1>
        <p className="text-sm text-slate-600">
          Session <span className="font-mono text-xs">{session.session_id}</span> · {session.status}
        </p>
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Interactive pitch configuration</h2>
        <p className="text-sm text-slate-600">
          Choose where you want the ball to pitch, set speed and ball type, then start your delivery
          sequence.
        </p>

        {/* Phase 1H-B placeholder — intentionally non-functional */}
        <div
          className="flex min-h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-100 px-4 py-8 text-center"
          aria-disabled="true"
          role="img"
          aria-label="Interactive pitch configuration placeholder"
        >
          <p className="text-sm font-medium text-slate-700">Pitch map coming in Phase 1H-B</p>
          <p className="mt-1 max-w-sm text-xs text-slate-500">
            Tap-to-target selection, speed controls, and ball type cards will appear here.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            router.push(`/app/practice/session/${session.session_id}`);
          }}
        >
          Open live session
        </button>
        <Link href="/app/practice/connect" className="btn-secondary text-center">
          Back to machine
        </Link>
      </section>
    </div>
  );
}

export default function PracticeSetupPage() {
  return (
    <Suspense fallback={<LoadingSpinner label="Loading setup" />}>
      <PracticeSetupContent />
    </Suspense>
  );
}
