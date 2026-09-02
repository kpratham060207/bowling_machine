'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { LogoutButton } from '@/components/auth-forms';

const NAV_ITEMS = [
  { href: '/app', label: 'Home' },
  { href: '/app/practice', label: 'Practice' },
  { href: '/app/plans', label: 'Plans' },
  { href: '/app/history', label: 'History' },
  { href: '/app/profile', label: 'Profile' },
];

type AppShellProps = {
  displayName?: string;
  children: React.ReactNode;
};

/**
 * Responsive player application shell — primary navigation and identity.
 * Designed mobile-first with large touch targets.
 */
export function AppShell({ displayName, children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-pitch-700">
              Bowling Machine
            </p>
            {displayName ? (
              <p className="text-sm text-slate-600">Hi, {displayName}</p>
            ) : (
              <p className="text-sm text-slate-600">Player training</p>
            )}
          </div>
          <LogoutButton />
        </div>

        <nav
          className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-2 pb-2 sm:px-4"
          aria-label="Primary"
        >
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || (item.href !== '/app' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'min-h-11 shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition',
                  active ? 'bg-pitch-700 text-white' : 'text-slate-700 hover:bg-slate-100',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="app-container">{children}</main>
    </div>
  );
}
