import type { Delivery } from '@bowling-machine/api-contracts';
import { BALL_TYPE_LABELS } from '@/lib/practice/setup-state';

type DeliveryReviewCardProps = {
  delivery: Delivery;
};

/** Presents requested, calculated, and observed delivery data as distinct categories. */
export function DeliveryReviewCard({ delivery }: DeliveryReviewCardProps) {
  const requested = delivery.requested;
  const calculated = delivery.calculated_parameters;
  const measured = delivery.measured;

  return (
    <article className="rounded-lg border border-slate-200 p-4 text-sm">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Delivery #{delivery.sequence_number}</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize">
          {delivery.status.toLowerCase()}
        </span>
      </header>

      <section className="space-y-1 border-l-2 border-pitch-600 pl-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Requested</h4>
        <p>Pitch target selected</p>
        <p>Requested speed: {requested.desired_speed_kmh} km/h</p>
        <p>Ball: {BALL_TYPE_LABELS[requested.ball_type]}</p>
        <p>
          Balls: {requested.number_of_balls} · First delay: {requested.first_ball_delay_ms} ms ·
          Interval: {requested.interval_ms} ms
        </p>
      </section>

      {calculated ? (
        <details className="mt-3 border-l-2 border-amber-500 pl-3">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-500">
            Calculated (backend)
          </summary>
          <p className="mt-1">
            Wheel targets: {calculated.wheel1_target_rpm} / {calculated.wheel2_target_rpm} RPM
          </p>
          <p className="text-xs text-slate-500">
            Engineering values from calculation engine — not measured on the machine.
          </p>
        </details>
      ) : null}

      <section className="mt-3 space-y-1 border-l-2 border-slate-400 pl-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Observed</h4>
        {delivery.executed_at ? (
          <p>Executed: {new Date(delivery.executed_at).toLocaleString()}</p>
        ) : null}
        {measured && (measured.wheel1_actual_rpm != null || measured.wheel2_actual_rpm != null) ? (
          <p>
            Wheel RPM: {measured.wheel1_actual_rpm ?? 'Not available'} /{' '}
            {measured.wheel2_actual_rpm ?? 'Not available'}
          </p>
        ) : (
          <p className="text-slate-500">Measured ball speed: Not available</p>
        )}
        {delivery.error?.message ? <p className="text-red-700">{delivery.error.message}</p> : null}
      </section>
    </article>
  );
}
