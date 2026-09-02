type LoadingSpinnerProps = {
  label?: string;
};

/** Accessible loading indicator for async actions and page loads. */
export function LoadingSpinner({ label = 'Loading' }: LoadingSpinnerProps) {
  return (
    <div
      className="flex items-center gap-3 text-sm text-slate-600"
      role="status"
      aria-live="polite"
    >
      <span
        className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-pitch-700"
        aria-hidden="true"
      />
      <span>{label}…</span>
    </div>
  );
}
