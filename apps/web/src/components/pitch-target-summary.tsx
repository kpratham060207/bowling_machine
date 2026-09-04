'use client';

import type { PitchTarget } from '@bowling-machine/api-contracts';
import { formatPitchDistanceM, getBowlingLengthFromTarget } from '@/lib/pitch/bowling-length';

type PitchTargetSummaryProps = {
  target: PitchTarget | null;
};

/**
 * Player-facing target panel — shows coaching length, distance, and lateral line.
 * Never exposes raw target_x / target_y to the normal player UI.
 */
export function PitchTargetSummary({ target }: PitchTargetSummaryProps) {
  if (!target) {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-900">Target</h3>
        <p className="mt-1 text-sm text-amber-900">
          Tap the pitch to choose where the ball should land
        </p>
      </section>
    );
  }

  const analysis = getBowlingLengthFromTarget(target);

  return (
    <section
      className="rounded-lg border border-pitch-200 bg-pitch-50 px-3 py-3"
      aria-live="polite"
    >
      <h3 className="text-xs font-semibold uppercase tracking-wide text-pitch-800">Target</h3>
      <p className="mt-1 text-lg font-semibold text-pitch-900">{analysis.label}</p>
      <p className="mt-0.5 text-sm text-slate-700">
        {formatPitchDistanceM(analysis.distanceFromBatterM)} from batter&apos;s crease
      </p>
      <p className="mt-1 text-sm text-slate-600">X position: {analysis.lateralLabel}</p>
    </section>
  );
}
