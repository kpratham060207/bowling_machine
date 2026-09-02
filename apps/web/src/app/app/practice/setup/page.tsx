'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import type { PracticeSession } from '@bowling-machine/api-contracts';
import { InteractivePitch } from '@/components/interactive-pitch';
import { PracticeSetupControls, PracticeSetupReview } from '@/components/practice-setup-controls';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuthenticatedServices } from '@/hooks/use-authenticated-services';
import { ApiClientError } from '@/lib/api/errors';
import { usePracticeContext } from '@/lib/practice/practice-context';
import { setupStateToDeliveryInput, validatePracticeSetup } from '@/lib/practice/setup-state';

/**
 * Practice setup — interactive pitch configuration and delivery submission.
 * Submits high-level parameters to Phase 1G orchestration; no machine physics here.
 */
function PracticeSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const { setupState, updateSetupState, setActiveSessionId } = usePracticeContext();
  const { api } = useAuthenticatedServices();
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [planName, setPlanName] = useState('');
  const [showSavePlan, setShowSavePlan] = useState(false);
  const [planSavedMessage, setPlanSavedMessage] = useState<string | null>(null);

  const validation = useMemo(() => validatePracticeSetup(setupState), [setupState]);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      setError('Missing session. Create a practice session first.');
      return;
    }

    setActiveSessionId(sessionId);

    void (async () => {
      try {
        const data = await api.getSession(sessionId);
        setSession(data);

        if (data.deliveries.length > 0) {
          router.replace(`/app/practice/session/${sessionId}`);
        }
      } catch (err) {
        setError(err instanceof ApiClientError ? err.displayMessage : 'Failed to load session');
      } finally {
        setLoading(false);
      }
    })();
  }, [api, sessionId, setActiveSessionId, router]);

  async function handleSaveAsPlan() {
    if (!validation.valid || savingPlan || !planName.trim()) {
      return;
    }

    setSavingPlan(true);
    setError(null);
    setPlanSavedMessage(null);

    try {
      const delivery = setupStateToDeliveryInput(setupState);
      const plan = await api.createPracticePlan({
        name: planName.trim(),
        deliveries: [delivery],
      });
      setPlanSavedMessage(`Saved as "${plan.name}". View it in Plans.`);
      setShowSavePlan(false);
      setPlanName('');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.displayMessage : 'Failed to save practice plan');
    } finally {
      setSavingPlan(false);
    }
  }

  async function handleStartPractice() {
    if (!sessionId || !validation.valid || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const body = setupStateToDeliveryInput(setupState);
      await api.createDelivery(sessionId, body);
      router.push(`/app/practice/session/${sessionId}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.displayMessage : 'Failed to start practice');
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingSpinner label="Loading session" />;
  }

  if (error && !session) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{error}</Alert>
        <Link href="/app/practice/connect" className="btn-secondary">
          Connect to a machine
        </Link>
      </div>
    );
  }

  if (!session) {
    return <Alert variant="error">Session not found</Alert>;
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold">Practice setup</h1>
        <p className="text-sm text-slate-600">
          Configure your delivery, review, then start practice on the machine.
        </p>
      </section>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {planSavedMessage ? <Alert variant="success">{planSavedMessage}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <section className="card">
          <InteractivePitch
            value={setupState.target}
            onChange={(target) => {
              updateSetupState({ target });
            }}
          />
        </section>

        <section className="card">
          <PracticeSetupControls
            state={setupState}
            onChange={updateSetupState}
            disabled={submitting}
          />
        </section>
      </div>

      {!showReview ? (
        <section className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="btn-primary"
            disabled={!validation.valid || submitting}
            onClick={() => {
              setShowReview(true);
            }}
          >
            Review configuration
          </button>
          <Link href="/app/practice/connect" className="btn-secondary text-center">
            Back to machine
          </Link>
        </section>
      ) : (
        <section className="card space-y-4">
          <h2 className="text-lg font-semibold">Review</h2>
          <PracticeSetupReview state={setupState} />

          {!validation.valid ? (
            <Alert variant="warning">{validation.errors.join(' · ')}</Alert>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              className="btn-primary"
              disabled={!validation.valid || submitting}
              onClick={() => void handleStartPractice()}
            >
              {submitting ? 'Starting practice…' : 'Start Practice'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={!validation.valid || submitting || savingPlan}
              onClick={() => {
                setShowSavePlan((current) => !current);
              }}
            >
              Save as Practice Plan
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={submitting}
              onClick={() => {
                setShowReview(false);
              }}
            >
              Edit
            </button>
          </div>

          {showSavePlan ? (
            <div className="space-y-3 rounded-lg border border-slate-200 p-4">
              <label className="block space-y-1">
                <span className="text-sm font-medium">Plan name</span>
                <input
                  type="text"
                  className="input w-full"
                  value={planName}
                  maxLength={100}
                  placeholder="Fast Outswing Practice"
                  onChange={(event) => {
                    setPlanName(event.target.value);
                  }}
                />
              </label>
              <button
                type="button"
                className="btn-primary"
                disabled={!validation.valid || savingPlan || !planName.trim()}
                onClick={() => void handleSaveAsPlan()}
              >
                {savingPlan ? 'Saving plan…' : 'Save plan'}
              </button>
            </div>
          ) : null}
        </section>
      )}
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
