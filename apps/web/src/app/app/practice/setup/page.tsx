'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import type { CalculationPreviewResponse, PracticeSession } from '@bowling-machine/api-contracts';
import { DeliveryCalculationResultPanel } from '@/components/calculation-preview-panel';
import { InteractivePitch } from '@/components/interactive-pitch';
import { Pitch3DViewerGate } from '@/components/pitch-3d-viewer-gate';
import { PracticeSetupControls, PracticeSetupReview } from '@/components/practice-setup-controls';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuthenticatedServices } from '@/hooks/use-authenticated-services';
import { ApiClientError } from '@/lib/api/errors';
import type { MachineSummary } from '@/lib/api/client';
import { usePracticeContext } from '@/lib/practice/practice-context';
import {
  getExecutionAvailability,
  getMachineConnectionLabel,
  getMachineConnectionState,
  resolveCalculationMachineId,
  shouldInvalidateCalculation,
} from '@/lib/practice/operating-context';
import { setupStateToDeliveryInput, validatePracticeSetup } from '@/lib/practice/setup-state';

/**
 * Practice setup — works with or without a connected machine.
 * Calculation never requires machine connection; execution uses Phase 1G when available.
 */
function PracticeSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const {
    setupState,
    updateSetupState,
    setActiveSessionId,
    selectedMachine,
    controlLock,
    liveMachineStatus,
  } = usePracticeContext();
  const { api } = useAuthenticatedServices();
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [authorizedMachines, setAuthorizedMachines] = useState<MachineSummary[]>([]);
  const [loading, setLoading] = useState(Boolean(sessionId));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [planName, setPlanName] = useState('');
  const [showSavePlan, setShowSavePlan] = useState(false);
  const [planSavedMessage, setPlanSavedMessage] = useState<string | null>(null);
  const [calculationResult, setCalculationResult] = useState<CalculationPreviewResponse | null>(
    null,
  );
  const [calculating, setCalculating] = useState(false);

  const validation = useMemo(() => validatePracticeSetup(setupState), [setupState]);

  const selectedMachineId =
    selectedMachine && 'machine_id' in selectedMachine ? selectedMachine.machine_id : null;

  const calculationMachineId = resolveCalculationMachineId({
    sessionMachineId: session?.machine_id ?? null,
    selectedMachineId,
    authorizedMachines,
  });

  const machineConnectionState = getMachineConnectionState(selectedMachine, liveMachineStatus);
  const machineLabel = getMachineConnectionLabel(machineConnectionState);

  const executionAvailability = getExecutionAvailability({
    selectedMachine,
    liveMachineStatus,
    controlLock,
    sessionId,
  });

  useEffect(() => {
    void api
      .listMachines()
      .then(setAuthorizedMachines)
      .catch(() => undefined);
  }, [api]);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      setSession(null);
      return;
    }

    setActiveSessionId(sessionId);
    setLoading(true);

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

  useEffect(() => {
    if (
      calculationResult &&
      shouldInvalidateCalculation({
        calculatedForMachineId: calculationResult.machine_id,
        currentMachineId: calculationMachineId,
      })
    ) {
      setCalculationResult(null);
    }
  }, [calculationMachineId, calculationResult]);

  function clearCalculationOnInputChange(): void {
    setCalculationResult(null);
  }

  async function handleCalculateDelivery() {
    if (!validation.valid || calculating) {
      return;
    }

    setCalculating(true);
    setError(null);

    try {
      const delivery = setupStateToDeliveryInput(setupState);
      const result = await api.previewCalculation({
        ...delivery,
        ...(calculationMachineId ? { machine_id: calculationMachineId } : {}),
      });
      setCalculationResult(result);
    } catch (err) {
      setCalculationResult(null);
      setError(err instanceof ApiClientError ? err.displayMessage : 'Failed to calculate delivery');
    } finally {
      setCalculating(false);
    }
  }

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

  if (error && sessionId && !session) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{error}</Alert>
        <Link href="/app/practice/setup" className="btn-secondary">
          Configure without session
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold">Practice setup</h1>
        <p className="text-sm text-slate-600">
          Configure your delivery and calculate machine parameters. Connect a machine only when you
          are ready to execute.
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-sm font-semibold text-slate-800">Machine status</h2>
        <p className="mt-1 text-sm text-slate-700">{machineLabel}</p>
        {session ? (
          <p className="text-sm text-slate-600">
            Session machine: {session.machine_name ?? 'Selected machine'}
          </p>
        ) : (
          <p className="text-sm text-slate-600">
            Calculation available without a connected machine.
          </p>
        )}
      </section>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {planSavedMessage ? <Alert variant="success">{planSavedMessage}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <section className="card">
          <InteractivePitch
            value={setupState.target}
            onChange={(target) => {
              updateSetupState({ target });
              clearCalculationOnInputChange();
            }}
          />
        </section>

        <section className="card">
          <PracticeSetupControls
            state={setupState}
            onChange={(patch) => {
              updateSetupState(patch);
              clearCalculationOnInputChange();
            }}
            disabled={submitting || calculating}
          />
        </section>
      </div>

      {/* 3D visualization — same target_x/target_y as the 2D pitch; never writes target state */}
      <Pitch3DViewerGate target={setupState.target} />

      {calculationResult ? (
        <DeliveryCalculationResultPanel
          result={calculationResult}
          machineLabel={machineLabel}
          executionAvailability={executionAvailability}
          recalculating={calculating}
          startingPractice={submitting}
          onRecalculate={() => void handleCalculateDelivery()}
          onStartPractice={
            executionAvailability === 'AVAILABLE' && sessionId
              ? () => void handleStartPractice()
              : undefined
          }
          connectHref={
            sessionId
              ? `/app/practice/connect?returnTo=${encodeURIComponent(`/app/practice/setup?sessionId=${sessionId}`)}`
              : '/app/practice/connect?returnTo=%2Fapp%2Fpractice%2Fsetup'
          }
        />
      ) : null}

      {!showReview ? (
        <section className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            className="btn-primary"
            disabled={!validation.valid || calculating || submitting}
            onClick={() => void handleCalculateDelivery()}
          >
            {calculating ? 'Calculating…' : 'Calculate delivery'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={!validation.valid || submitting || calculating}
            onClick={() => {
              setShowReview(true);
            }}
          >
            Review configuration
          </button>
          <Link href="/app/practice" className="btn-secondary text-center">
            Back to practice
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
            {executionAvailability === 'AVAILABLE' && sessionId ? (
              <button
                type="button"
                className="btn-primary"
                disabled={!validation.valid || submitting}
                onClick={() => void handleStartPractice()}
              >
                {submitting ? 'Starting practice…' : 'Start practice'}
              </button>
            ) : (
              <Link
                href={
                  sessionId
                    ? `/app/practice/connect?returnTo=${encodeURIComponent(`/app/practice/setup?sessionId=${sessionId}`)}`
                    : '/app/practice/connect?returnTo=%2Fapp%2Fpractice%2Fsetup'
                }
                className="btn-primary text-center"
              >
                Connect machine to execute
              </Link>
            )}
            <button
              type="button"
              className="btn-secondary"
              disabled={!validation.valid || submitting || savingPlan}
              onClick={() => {
                setShowSavePlan((current) => !current);
              }}
            >
              Save as practice plan
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
                  placeholder="Fast outswing practice"
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
