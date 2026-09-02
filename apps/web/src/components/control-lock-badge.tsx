import type { ControlLockUiState } from '@/lib/machine/presentation';
import { controlLockLabel } from '@/lib/machine/presentation';
import clsx from 'clsx';

type ControlLockBadgeProps = {
  state: ControlLockUiState;
};

/** Visual indicator for machine control lock — backend is authoritative. */
export function ControlLockBadge({ state }: ControlLockBadgeProps) {
  const styles: Record<ControlLockUiState, string> = {
    AVAILABLE: 'bg-slate-100 text-slate-700 border-slate-200',
    ACQUIRING: 'bg-blue-50 text-blue-800 border-blue-200',
    CONTROLLED_BY_ME: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    CONTROLLED_BY_OTHER: 'bg-amber-50 text-amber-900 border-amber-200',
    EXPIRED: 'bg-red-50 text-red-800 border-red-200',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
        styles[state],
      )}
      aria-label={`Control lock: ${controlLockLabel(state)}`}
    >
      {controlLockLabel(state)}
    </span>
  );
}
