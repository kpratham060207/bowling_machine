'use client';

import type { PitchTarget } from '@bowling-machine/api-contracts';
import { formatPitchDistanceM, getBowlingLengthFromTarget } from '@/lib/pitch/bowling-length';

type PitchTargetSummaryProps = {
  target: PitchTarget | null;
};

/**
 * Compact target feedback — same card style as the original practice controls.
 * Shows derived length/distance without exposing raw target_x / target_y.
 */
export function PitchTargetSummary({ target }: PitchTargetSummaryProps) {
  if (!target) {
    return (
      <section className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <h3 className="text-sm font-semibold text-slate-800">Target</h3>
        <p className="text-sm text-amber-800">Tap the pitch to choose a landing spot</p>
      </section>
    );
  }

  const analysis = getBowlingLengthFromTarget(target);

  return (
    <section
      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
      aria-live="polite"
    >
      <h3 className="text-sm font-semibold text-slate-800">Target</h3>
      <p className="text-sm text-slate-600">
        {analysis.label} · {formatPitchDistanceM(analysis.distanceFromBatterM)}
        <span className="text-slate-500"> · {analysis.lateralLabel}</span>
      </p>
    </section>
  );
}
