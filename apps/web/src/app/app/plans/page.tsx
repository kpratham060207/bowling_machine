'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PracticePlan } from '@bowling-machine/api-contracts';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuthenticatedServices } from '@/hooks/use-authenticated-services';
import { ApiClientError } from '@/lib/api/errors';

/** Lists the player's saved practice plans. */
export default function PlansPage() {
  const { api } = useAuthenticatedServices();
  const [plans, setPlans] = useState<PracticePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setPlans(await api.listPracticePlans());
      } catch (err) {
        setError(err instanceof ApiClientError ? err.displayMessage : 'Failed to load plans');
      } finally {
        setLoading(false);
      }
    })();
  }, [api]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Practice plans</h1>
        <Link href="/app/plans/new" className="btn-primary">
          New plan
        </Link>
      </div>

      {loading ? <LoadingSpinner label="Loading plans" /> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}

      {!loading && !error && plans.length === 0 ? (
        <EmptyState
          title="No saved plans yet"
          description="Save a reusable delivery configuration to start practice faster next time."
          action={
            <Link href="/app/plans/new" className="btn-primary">
              Create plan
            </Link>
          }
        />
      ) : null}

      {!loading && plans.length > 0 ? (
        <ul className="space-y-3">
          {plans.map((plan) => (
            <li key={plan.plan_id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{plan.name}</p>
                  {plan.description ? (
                    <p className="text-sm text-slate-600">{plan.description}</p>
                  ) : null}
                  <p className="text-sm text-slate-500">
                    {plan.deliveries.length} delivery sequence(s)
                  </p>
                </div>
                <Link href={`/app/plans/${plan.plan_id}`} className="btn-secondary shrink-0">
                  Open
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
