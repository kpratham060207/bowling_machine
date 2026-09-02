'use client';

import Link from 'next/link';
import type { CalculationPreviewResponse } from '@bowling-machine/api-contracts';
import { BALL_TYPE_LABELS } from '@/lib/practice/setup-state';
import type { ExecutionAvailability } from '@/lib/practice/operating-context';
import { Alert } from '@/components/ui/alert';

type DeliveryCalculationResultPanelProps = {
  result: CalculationPreviewResponse;
  machineLabel: string;
  executionAvailability: ExecutionAvailability;
  onRecalculate?: () => void;
  recalculating?: boolean;
  connectHref?: string;
  onStartPractice?: () => void;
  startingPractice?: boolean;
};

/** Formats nullable RPM for display — never implies observed hardware measurement. */
function formatRpm(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—';
  }
  return `${String(value)} RPM`;
}

/** Formats nullable actuator position — units are machine-local (UD-02). */
function formatActuator(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—';
  }
  return String(value);
}

/**
 * Displays calculation results with clear separation of requested, calculated,
 * calibration, and execution state. Calculated values are never shown as measured output.
 */
export function DeliveryCalculationResultPanel({
  result,
  machineLabel,
  executionAvailability,
  onRecalculate,
  recalculating,
  connectHref = '/app/practice/connect',
  onStartPractice,
  startingPractice,
}: DeliveryCalculationResultPanelProps) {
  const calculationComplete = result.validation.valid && result.calculated !== null;

  return (
    <section className="card space-y-4" aria-live="polite">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {calculationComplete ? 'Calculation complete' : 'Calculation result'}
          </h2>
          <p className="text-sm text-slate-600">{result.disclaimer}</p>
        </div>
        {onRecalculate ? (
          <button
            type="button"
            className="btn-secondary shrink-0"
            disabled={recalculating}
            onClick={onRecalculate}
          >
            {recalculating ? 'Recalculating…' : 'Recalculate'}
          </button>
        ) : null}
      </div>

      {!result.validation.valid ? (
        <Alert variant="error">
          {result.validation.errors.map((error) => error.message).join(' · ') ||
            'Calculation could not be completed'}
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Requested
          </h3>
          <dl className="mt-3 grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">Target</dt>
              <dd className="font-medium text-slate-900">
                ({result.requested.target.target_x.toFixed(2)},{' '}
                {result.requested.target.target_y.toFixed(2)})
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">Speed</dt>
              <dd className="font-medium text-slate-900">
                {result.requested.desired_speed_kmh} km/h
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">Ball type</dt>
              <dd className="font-medium text-slate-900">
                {BALL_TYPE_LABELS[result.requested.ball_type]}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">Ball count</dt>
              <dd className="font-medium text-slate-900">{result.requested.number_of_balls}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">First ball delay</dt>
              <dd className="font-medium text-slate-900">
                {(result.requested.first_ball_delay_ms / 1000).toFixed(1)} s
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">Interval</dt>
              <dd className="font-medium text-slate-900">
                {(result.requested.interval_ms / 1000).toFixed(1)} s
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-slate-200 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Calculated
          </h3>
          {result.calculated ? (
            <dl className="mt-3 grid gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Wheel 1 target</dt>
                <dd className="font-medium text-slate-900">
                  {formatRpm(result.calculated.wheel1_target_rpm)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Wheel 2 target</dt>
                <dd className="font-medium text-slate-900">
                  {formatRpm(result.calculated.wheel2_target_rpm)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Actuator 1</dt>
                <dd className="font-medium text-slate-900">
                  {formatActuator(result.calculated.actuator1_target_position)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Actuator 2</dt>
                <dd className="font-medium text-slate-900">
                  {formatActuator(result.calculated.actuator2_target_position)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Actuator 3</dt>
                <dd className="font-medium text-slate-900">
                  {formatActuator(result.calculated.actuator3_target_position)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Actuator 4</dt>
                <dd className="font-medium text-slate-900">
                  {formatActuator(result.calculated.actuator4_target_position)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Feeder delay</dt>
                <dd className="font-medium text-slate-900">
                  {result.calculated.feeder_delay_ms === null
                    ? '—'
                    : `${String(result.calculated.feeder_delay_ms)} ms`}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-slate-600">No calculated parameters available.</p>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Calibration
        </h3>
        {result.calibration ? (
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-600">Profile</dt>
              <dd className="font-medium text-slate-900">{result.calibration.profile_id}</dd>
            </div>
            <div>
              <dt className="text-slate-600">Type</dt>
              <dd className="font-medium text-slate-900">{result.calibration.calibration_type}</dd>
            </div>
            <div>
              <dt className="text-slate-600">Version</dt>
              <dd className="font-medium text-slate-900">{result.calibration.version}</dd>
            </div>
            <div>
              <dt className="text-slate-600">Mode</dt>
              <dd className="font-medium text-slate-900">
                {result.calibration.simulation || result.calibration.is_simulation_fallback
                  ? 'Simulation calibration'
                  : 'Machine calibration'}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-slate-600">No calibration profile was used.</p>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Execution</h3>
        <dl className="mt-3 grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">Machine</dt>
            <dd className="font-medium text-slate-900">{machineLabel}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">Execution</dt>
            <dd className="font-medium text-slate-900">
              {executionAvailability === 'AVAILABLE'
                ? 'Ready for execution'
                : executionAvailability === 'UNAVAILABLE'
                  ? 'Control required before execution'
                  : 'Not executed — no machine connected'}
            </dd>
          </div>
        </dl>

        {executionAvailability === 'AVAILABLE' && onStartPractice ? (
          <button
            type="button"
            className="btn-primary mt-4"
            disabled={!calculationComplete || startingPractice}
            onClick={onStartPractice}
          >
            {startingPractice ? 'Starting practice…' : 'Start practice'}
          </button>
        ) : null}

        {executionAvailability !== 'AVAILABLE' ? (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link href={connectHref} className="btn-secondary text-center">
              Connect machine to execute
            </Link>
          </div>
        ) : null}
      </section>

      {result.warnings.length > 0 ? (
        <Alert variant="warning">{result.warnings.join(' · ')}</Alert>
      ) : null}
    </section>
  );
}

/** @deprecated Use DeliveryCalculationResultPanel — kept for import compatibility during transition. */
export const CalculationPreviewPanel = DeliveryCalculationResultPanel;
