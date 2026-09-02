import type { ReactNode } from 'react';
import clsx from 'clsx';

type AlertProps = {
  variant?: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  children: ReactNode;
  className?: string;
};

/** Accessible alert banner for errors, warnings, and status messages. */
export function Alert({ variant = 'info', title, children, className }: AlertProps) {
  const styles = {
    info: 'border-slate-200 bg-slate-50 text-slate-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    error: 'border-red-200 bg-red-50 text-red-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  }[variant];

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={clsx('rounded-lg border px-4 py-3 text-sm', styles, className)}
    >
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      <div>{children}</div>
    </div>
  );
}
