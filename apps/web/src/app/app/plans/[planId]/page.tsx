'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { PracticePlan } from '@bowling-machine/api-contracts';
import { InteractivePitch } from '@/components/interactive-pitch';
import { PracticeSetupControls, PracticeSetupReview } from '@/components/practice-setup-controls';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuthenticatedServices } from '@/hooks/use-authenticated-services';
import { usePracticeContext } from '@/lib/practice/practice-context';
import { ApiClientError } from '@/lib/api/errors';
import {
  setupStateToDeliveryInput,
  validatePracticeSetup,
  type PracticeSetupState,
} from '@/lib/practice/setup-state';

function planToSetup(plan: PracticePlan): PracticeSetupState {
  const first = plan.deliveries[0];
  return {
    target: first ? { target_x: first.target_x, target_y: first.target_y } : null,
    desired_speed_kmh: first?.desired_speed_kmh ?? 120,
    ball_type: first?.ball_type ?? 'FAST',
    number_of_balls: first?.number_of_balls ?? 6,
    first_ball_delay_ms: first?.first_ball_delay_ms ?? 3000,
    interval_ms: first?.interval_ms ?? 8000,
  };
}

/** View, edit, delete, or start a saved practice plan. */
export default function PlanDetailPage() {
  const params = useParams<{ planId: string }>();
  const router = useRouter();
  const practice = usePracticeContext();
  const { api } = useAuthenticatedServices();
  const [plan, setPlan] = useState<PracticePlan | null>(null);
  const [setup, setSetup] = useState<PracticeSetupState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validation = useMemo(
    () => (setup ? validatePracticeSetup(setup) : { valid: false, errors: [] }),
    [setup],
  );

  useEffect(() => {
    void (async () => {
      try {
        const data = await api.getPracticePlan(params.planId);
        setPlan(data);
        setSetup(planToSetup(data));
      } catch (err) {
        setError(err instanceof ApiClientError ? err.displayMessage : 'Failed to load plan');
      } finally {
        setLoading(false);
      }
    })();
  }, [api, params.planId]);

  async function handleSave() {
    if (!plan || !setup || !validation.valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.updatePracticePlan(plan.plan_id, {
        name: plan.name,
        description: plan.description ?? undefined,
        deliveries: [setupStateToDeliveryInput(setup)],
      });
      setPlan(updated);
      setSetup(planToSetup(updated));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.displayMessage : 'Failed to update plan');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!plan || busy) return;
    setBusy(true);
    try {
      await api.deletePracticePlan(plan.plan_id);
      router.push('/app/plans');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.displayMessage : 'Failed to delete plan');
      setBusy(false);
    }
  }

  async function handleStart() {
    if (!plan || busy) return;
    const machineId =
      practice.selectedMachine && 'machine_id' in practice.selectedMachine
        ? practice.selectedMachine.machine_id
        : null;

    if (!machineId) {
      setError('Connect to a machine first, then start this plan from the machine page.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const session = await api.startPracticePlan(plan.plan_id, machineId);
      router.push(`/app/practice/session/${session.session_id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.displayMessage : 'Failed to start plan');
      setBusy(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading plan" />;
  if (!plan || !setup) return <Alert variant="error">{error ?? 'Plan not found'}</Alert>;

  return (
    <div className="space-y-6">
      <Link href="/app/plans" className="text-sm font-medium text-pitch-700 hover:underline">
        ← Back to plans
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{plan.name}</h1>
        {plan.description ? <p className="text-sm text-slate-600">{plan.description}</p> : null}
      </header>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <InteractivePitch
            value={setup.target}
            onChange={(target) => {
              setSetup({ ...setup, target });
            }}
          />
        </section>
        <section className="card">
          <PracticeSetupControls
            state={setup}
            onChange={(patch) => {
              setSetup({ ...setup, ...patch });
            }}
            disabled={busy}
          />
        </section>
      </div>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Review</h2>
        <PracticeSetupReview state={setup} />
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={() => void handleStart()}
          >
            Start practice
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={!validation.valid || busy}
            onClick={() => void handleSave()}
          >
            Save changes
          </button>
          <button
            type="button"
            className="btn-danger"
            disabled={busy}
            onClick={() => void handleDelete()}
          >
            Delete plan
          </button>
        </div>
      </section>
    </div>
  );
}
